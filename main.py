from fastapi import FastAPI, HTTPException
import uvicorn
import os
import json
import uuid
import asyncio
import base64 as base64_module
import traceback
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv

load_dotenv()

# 架构说明：本服务只负责画像/向量/标签比对等 HTTP API；Firestore 中 affinities 与
# matchedParticipant 的写入与「全员重算最高分匹配」由 firestore_worker 在 ready 阶段完成。

# ==========================================
# 0. 环境与代理配置 (保持与 Worker 一致)
# ==========================================
proxy_url = os.getenv("HTTP_PROXY") or os.getenv("http_proxy") or "http://127.0.0.1:7890"
if proxy_url:
    os.environ['http_proxy'] = proxy_url
    os.environ['https_proxy'] = proxy_url
    os.environ['grpc_proxy'] = proxy_url

# ==========================================
# 1. 初始化 Gemini（优先使用 API Key）
# ==========================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    _model = genai.GenerativeModel("gemini-2.5-flash")
    _use_api_key = True
    print("✅ [AI] 使用 Gemini API Key 模式")
else:
    from google.cloud import aiplatform
    from vertexai.preview.generative_models import GenerativeModel
    aiplatform.init(project=os.getenv("GOOGLE_CLOUD_PROJECT", "gdg-hackathon-2026-aquila314"), location="us-central1")
    _model = GenerativeModel("gemini-2.0-flash")
    _use_api_key = False
    print("✅ [AI] 使用 Vertex AI 模式")

app = FastAPI(title="Ice-Breaker AI Engine", description="纯粹的 AI 算力节点")


def _safe_image_mime(mime: Optional[str]) -> str:
    m = (mime or "image/jpeg").split(";")[0].strip().lower()
    allowed = ("image/jpeg", "image/png", "image/webp", "image/gif")
    return m if m in allowed else "image/jpeg"


async def _generate_json(
    prompt: str,
    response_mime_type: str = "application/json",
    image_base64: Optional[str] = None,
    image_mime_type: Optional[str] = None,
) -> str:
    """统一调用 Gemini，返回 JSON 字符串。可选传入 image_base64 做多模态分析"""
    import base64
    parts = []
    if image_base64:
        try:
            img_data = base64.b64decode(image_base64)
            mime = _safe_image_mime(image_mime_type)
            parts.append({"inline_data": {"mime_type": mime, "data": img_data}})
        except Exception:
            pass
    parts.append(prompt)

    if _use_api_key:
        def _sync_gen():
            response = _model.generate_content(
                parts,
                generation_config={"response_mime_type": response_mime_type}
            )
            return response.text
        return await asyncio.to_thread(_sync_gen)
    else:
        response = await _model.generate_content_async(
            parts,
            generation_config={"response_mime_type": response_mime_type}
        )
        return response.text


# ==========================================
# 2. 严格的 Pydantic 数据契约
# ==========================================

# --- 第一轮：相机路径看图（mood 路径不调用此接口）---
class AnalyzeVibePayload(BaseModel):
    room_id: str
    participant_id: str
    username: str
    mood: str = ""
    input_mode: str = "camera"
    language: str = "en"
    image_base64: str
    image_mime_type: Optional[str] = None


# --- 接口 A 的输入模型（第二轮：出题）---
class GenerateQuestionsPayload(BaseModel):
    room_id: str
    participant_id: str
    username: str
    mood: str
    pronoun: Optional[str] = ""
    ocean_vector: List[int] = [50, 50, 50, 50, 50]  # Nexus 五轴初始向量 V[0]..V[4] (0-100)，与 forge/generate_questions 矩阵一致
    language: str = "en"  # 用户界面语言：en | jp | cn（与前端一致）
    input_mode: str = "mood"  # mood | camera
    vibe_analysis: str = ""  # 仅 camera：第一轮 analyze_vibe 的图文侧写，作为出题参考

# --- 接口 B 的输入模型 ---
class QAItem(BaseModel):
    questionId: str
    question: str
    answer: str

class ForgeProfilePayload(BaseModel):
    room_id: str
    participant_id: str
    username: str
    mood: str
    qa: List[QAItem]
    ocean_vector: List[int] = [50, 50, 50, 50, 50]  # Nexus 五轴初始向量，供 forge 修正为 final_vector
    image_base64: Optional[str] = None  # 无 image_tag_prefill 时 camera 兜底多模态
    image_mime_type: Optional[str] = None  # 如 image/jpeg、image/png
    input_mode: str = "mood"  # mood=无图用心情 | camera=有图（与前端 inputMode 一致）
    language: str = "en"  # 用户界面语言：en | jp | cn
    image_tag_prefill: Optional[Any] = None  # camera：图标签；字符串（旧）或 {"en","cn","jp"} 对象


class CompareTagsPayload(BaseModel):
    """双方各 2 个标签；兼容旧版三语 dict。"""
    source_tags: List[Any]
    targets: List[List[Any]]


def _normalize_ui_language(code: Optional[str]) -> str:
    """与前端 Language 对齐：en | jp | cn"""
    if not code:
        return "en"
    c = str(code).lower().strip()
    if c in ("jp", "ja"):
        return "jp"
    if c in ("cn", "zh", "zh-cn", "zh_cn"):
        return "cn"
    return "en"


def _output_language_clause(lang: str) -> str:
    """写入各 prompt：单语字段 vs 三语字段（按接口不同）。"""
    lang = _normalize_ui_language(lang)
    if lang == "jp":
        return """
        【输出语言 — 必须严格遵守】
        用户界面语言为 **日语 (jp)**。各接口实际字段如下（未列出的键勿画蛇添足）：
        - **单语（日本語のみ）**：`generate_questions` の各 `questions[].text`；`forge_profile` の `animal_spirit`；`analyze_vibe` の `vibe_analysis`。
        - **三語オブジェクト必須**：`forge_profile` の各 `aiTopics` 要素・各 `tags` 要素；`analyze_vibe` の `image_tag`（`en`/`cn`/`jp`）。これらは UI 言語の例外。
        上記以外のユーザー向け文字列に他言語を混ぜない。JSON のみ返す。"""
    if lang == "cn":
        return """
        【输出语言 — 必须严格遵守】
        用户界面语言为 **简体中文 (cn)**。各接口实际输出字段如下（勿添加未要求的键）：
        - **仅简体中文**：`generate_questions` 中每条 `questions[].text`；`forge_profile` 中的 `animal_spirit`；`analyze_vibe` 中的 `vibe_analysis`。
        - **必须为三语对象**：`forge_profile` 中每条 `aiTopics`、每条 `tags`；`analyze_vibe` 中的 `image_tag`（键 `en`/`cn`/`jp`）。以上为界面语言的例外。
        不要在其他面向用户的字符串中混用语言。仅返回 JSON。"""
    return """
        【输出语言 — 必须严格遵守】
        UI language is **English (en)**. Each endpoint only outputs the fields it defines (do not add extra keys):
        - **English only:** `generate_questions` → each `questions[].text`; `forge_profile` → `animal_spirit`; `analyze_vibe` → `vibe_analysis`.
        - **Trilingual objects (en/cn/jp):** `forge_profile` → each `aiTopics` item and each `tags` item; `analyze_vibe` → `image_tag`.
        Do not mix languages in fields meant to be English-only. Return JSON only."""


def _fallback_tag(lang: str) -> str:
    lang = _normalize_ui_language(lang)
    return {"en": "general", "jp": "一般", "cn": "一般"}.get(lang, "general")


def _fallback_topic(lang: str) -> str:
    lang = _normalize_ui_language(lang)
    return {
        "en": "Icebreaker topic",
        "jp": "アイスブレーク",
        "cn": "破冰话题",
    }.get(lang, "Icebreaker topic")


def _fallback_tag_tri() -> dict:
    return {"en": "general", "cn": "一般", "jp": "一般"}


def _normalize_one_tag_tri(raw: Any) -> dict:
    """单条 tag → {{en, cn, jp}}；兼容字符串或旧版单语/残缺的 dict。"""
    fb = _fallback_tag_tri()
    if isinstance(raw, dict):
        en = str(raw.get("en") or "").strip()
        cn = str(raw.get("cn") or raw.get("zh") or "").strip()
        jp = str(raw.get("jp") or raw.get("ja") or "").strip()
        if not (en or cn or jp):
            return dict(fb)
        return {
            "en": en or cn or jp or fb["en"],
            "cn": cn or en or jp or fb["cn"],
            "jp": jp or en or cn or fb["jp"],
        }
    if isinstance(raw, str) and raw.strip():
        s = raw.strip()
        return {"en": s, "cn": s, "jp": s}
    return dict(fb)


def _coerce_prefill_to_tag_tri(prefill: Any) -> dict:
    """camera 预填：Firestore 可能存字符串（旧）或三语对象。"""
    if isinstance(prefill, dict) and prefill:
        return _normalize_one_tag_tri(prefill)
    s = str(prefill or "").strip()
    if s:
        return {"en": s, "cn": s, "jp": s}
    return _fallback_tag_tri()


def _normalize_two_tags_trilingual(raw: Any) -> List[dict]:
    out: List[dict] = []
    if isinstance(raw, list):
        for t in raw[:2]:
            out.append(_normalize_one_tag_tri(t))
    while len(out) < 2:
        out.append(_fallback_tag_tri())
    return out


def _tag_tri_to_compare_string(tri: dict) -> str:
    """供 compare_tags：合并三语为一段，便于跨语言语义打分。"""
    en = str((tri or {}).get("en") or "").strip()
    cn = str((tri or {}).get("cn") or "").strip()
    jp = str((tri or {}).get("jp") or "").strip()
    parts: List[str] = []
    for p in (en, cn, jp):
        if p and p not in parts:
            parts.append(p)
    return " / ".join(parts) if parts else "general"


def _normalize_tag_string(raw: Any, lang: str) -> str:
    """单条 tag 规整为某一界面语言的字符串（兼容历史）。"""
    fb = _fallback_tag(lang)
    tri = _normalize_one_tag_tri(raw)
    l = _normalize_ui_language(lang)
    if l == "jp":
        return tri.get("jp") or tri.get("cn") or tri.get("en") or fb
    if l == "cn":
        return tri.get("cn") or tri.get("en") or tri.get("jp") or fb
    return tri.get("en") or tri.get("cn") or tri.get("jp") or fb


def _normalize_ai_topics_trilingual(raw: Any) -> List[dict]:
    """
    aiTopics：3 条；每条为 {"en","cn","jp"} 三语短句（与 UI 语言无关，卡片上同时展示）。
    兼容旧版：字符串或单语 list → 三语填相同内容。
    """
    fb_en = _fallback_topic("en")
    fb_cn = _fallback_topic("cn")
    fb_jp = _fallback_topic("jp")

    def one(item: Any) -> dict:
        if isinstance(item, dict):
            en = str(item.get("en") or "").strip()
            cn = str(item.get("cn") or item.get("zh") or "").strip()
            jp = str(item.get("jp") or item.get("ja") or "").strip()
            if not (en or cn or jp):
                return {"en": fb_en, "cn": fb_cn, "jp": fb_jp}
            return {
                "en": en or cn or jp or fb_en,
                "cn": cn or en or jp or fb_cn,
                "jp": jp or en or cn or fb_jp,
            }
        if isinstance(item, str) and item.strip():
            s = item.strip()
            return {"en": s, "cn": s, "jp": s}
        return {"en": fb_en, "cn": fb_cn, "jp": fb_jp}

    out: List[dict] = []
    if isinstance(raw, list):
        for item in raw[:3]:
            out.append(one(item))
    while len(out) < 3:
        out.append({"en": fb_en, "cn": fb_cn, "jp": fb_jp})
    return out


def _format_tags_for_compare_lines(tags: List[str]) -> str:
    parts = [t for t in (tags or [])[:2] if t]
    return "、".join(parts) if parts else "(无)"


def _coerce_two_tag_strings(tags: Any) -> List[str]:
    """将任意结构的 2 个 tag 转为 2 条比对用字符串（三语折叠，compare_tags 入口）。"""
    tris = _normalize_two_tags_trilingual(tags if isinstance(tags, list) else [])
    return [_tag_tri_to_compare_string(t) for t in tris]


# ==========================================
# 2. 核心 AI 接口
# ==========================================

@app.post("/api/analyze_vibe")
async def analyze_vibe(data: AnalyzeVibePayload):
    """
    第一轮（仅 camera）：多模态分析自拍，产出
    - vibe_analysis：社交破冰侧写，供 generate_questions 参考
    - image_tag：三语气质标签（forge 时与回答 tag 配对）
    mood 路径请勿调用本接口。
    """
    imode = (data.input_mode or "camera").strip().lower()
    raw_b64 = (data.image_base64 or "").strip()
    if imode != "camera" or not raw_b64:
        raise HTTPException(
            status_code=400,
            detail="analyze_vibe 仅支持 input_mode=camera 且必须提供 image_base64",
        )
    ui_lang = _normalize_ui_language(data.language)
    print(f"🎬 [AI] analyze_vibe | {data.username} | lang={ui_lang}")
    try:
        lang_clause = _output_language_clause(data.language)
        prompt = f"""
你是一位极其敏锐的「社交破冰侧写师 (Social Profiler)」。用户 {data.username} 在签到时上传了一张实时照片，当前心情/状态：「{data.mood or '未填写'}」。

你的任务是通过这张照片，捕捉 TA 身上隐藏的社交线索，为后续的“专属破冰问题生成”提供极其丰富的上下文弹药。

【分析重点：看图抓手】
1. 观察穿搭与随身物品（如：极客感 T 恤、降噪耳机、机械键盘、咖啡杯等）。
2. 捕捉环境与光影氛围（如：深夜工位、阳光户外的松弛感、拥挤的会场）。

{lang_clause}

【输出约束】
1. `vibe_analysis`：一段 2～4 句话的生动侧写。不要写流水账，要像侦探一样指出有意思的细节和潜在的“聊天切入点”。（禁忌：绝对不要输出“为了生成问题……”、“这张照片展现了……”等 AI 味极重的废话元话语，直接给出侧写结论）。
2. `image_tag`：为 TA 提炼一个极具“网感”和“画面感”的气质标签（例如：“硬核赛博极客”、“微醺松弛感”、“靠冰美式续命的肝帝”）。必须包含严格的 `"en"`, `"cn"`, `"jp"` 三语键值对，且翻译要地道、符合当地年轻人的流行社交语境（2-10个词）。

严格按照以下格式输出纯 JSON：
```json
{{
    "vibe_analysis": "...",
    "image_tag": {{
        "en": "...",
        "cn": "...",
        "jp": "..."
    }}
}}
```
"""
        raw_text = await _generate_json(
            prompt,
            image_base64=raw_b64,
            image_mime_type=data.image_mime_type,
        )
        clean = raw_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
        va = str(result.get("vibe_analysis", "") or "").strip()
        itag_raw = result.get("image_tag")
        itag_tri = _normalize_one_tag_tri(itag_raw)
        if itag_tri == _fallback_tag_tri() and not (
            isinstance(itag_raw, dict) and any(str(itag_raw.get(k) or "").strip() for k in ("en", "cn", "zh", "jp", "ja"))
        ):
            # 模型完全未给到有效标签时，三语填同一兜底词
            fb = _fallback_tag(ui_lang)
            itag_tri = {"en": fb, "cn": fb, "jp": fb}
        if not va:
            va = "（未能生成有效侧写）"
        print(f"✅ [AI] analyze_vibe 完成 | image_tag(三语)={itag_tri} | vibe_analysis 前80字: {va[:80]}...")
        return {"vibe_analysis": va, "image_tag": itag_tri}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [AI] analyze_vibe 失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate_questions")
async def generate_questions(data: GenerateQuestionsPayload):
    """
    【回合一】：根据路径与 Nexus 向量，生成 3 道破冰问题（JSON questions）。
    """
    imode = (data.input_mode or "mood").strip().lower()
    if imode not in ("camera", "mood"):
        imode = "mood"
    va = (data.vibe_analysis or "").strip()
    print(
        f"🧠 [AI] 正在为 {data.username} 构思问题... (lang={_normalize_ui_language(data.language)}, mode={imode})"
    )
    try:
        lang_clause = _output_language_clause(data.language)
        if imode == "camera" and va:
            path_hint = f"""
        【视觉侧写参考】系统已提取该用户的「第一印象侧写」：
        「{va}」
        请你**优先结合这份侧写 + TA 的五维人格向量（见下方 Nexus 矩阵）**来设计破冰问题。
        请尽量避免在问题正文里直接出现「照片」「自拍」「上传」「从画面中看到」等词，保持面对面搭讪的自然感。
        用面对面搭讪的口吻，把你从侧写里读到的具体元素当作钩子（例如穿搭细节、桌面物件、光线氛围、气质），自然切入。
        """
        elif imode == "mood":
            path_hint = f"""
        【内心轨迹参考】TA 选择用文字/表情表达了此刻的心情状态：
        「{data.mood or '（未特别说明）'}」
        请将该心情作为**隐性的氛围底色**，结合 TA 的五维人格向量（见下方 Nexus 矩阵）来设计破冰问题。
        **须遵守：**
        1. **严禁生硬照抄原词/中英夹杂**：若输入是英文词（如 Energetic）而【输出语言】为中文时，须消化为中文表达（如「精力充沛」「劲头十足」），不可在中文句子里夹英文原词。
        2. **严禁主题重复**：不要在 3 个问题里反复拿该心情词做文章；**最多**其中 1 道题可顺口、含蓄地点一下氛围，其余须彻底离开该词面。
        3. **强制发散**：这句只言片语只是引子；请像老朋友一样，把 3 个问题发到**不同维度**（例如生活小习惯、荒诞情境脑洞、纯粹的精神/价值观小品）。
        """
        else:
            path_hint = f"""
        【综合参考】当前暂无视觉侧写，请参考 TA 的心情描述：「{data.mood or '（未特别说明）'}」与五维人格向量（见下文 Nexus 矩阵）。
        请将心情消化为**隐性氛围**，严禁在问题里生硬照抄心情原词或中英夹杂；发散思维，放在轻松的青年派对语境里，设计**三个维度完全不同**的脑洞题。
        """
        prompt = f"""
        你是一位洞察力极强的「灵魂破冰主理人」，正在主持一场汇集了有趣灵魂的青年社交派对。
        新朋友 {data.username} 刚刚进场。
        {path_hint}

        【核心基底：Nexus 潜意识投影矩阵（创作向解读）】
        TA 的五维人格向量 (0-100) 是：{data.ocean_vector}。
        五个数字的顺序与系统一致；请用以下「审美与潜意识」视角理解每一维（0 偏左，100 偏右），仅作编题的灵感，不必在答复中解释矩阵本身：
        1. V[0] 时间质感：历史沉淀与自然肌理 (低) <---> 未来感与人造流光 (高)
        2. V[1] 组织气质：感性、随意、解构 (低) <---> 理性、秩序、严丝合缝 (高)
        3. V[2] 社交能量：独处与低频连接 (低) <---> 热闹与高频互动 (高)
        4. V[3] 协作感：独行、游侠气 (低) <---> 合拍、互相接得住 (高)
        5. V[4] 信息负荷：极简、降噪 (低) <---> 繁复、多线程 (高)

        【任务】
        请基于侧写线索与上述底色，为 {data.username} 量身定制 **3 个截然不同** 的非典型脑洞问题。

        【写作偏好（尽量遵守，不必草木皆兵）】
        - 不要把「内心轨迹/心情」里的原词当填空塞进题干；它只影响语气与氛围，**不要**让三道题都围着同一个心情词转。
        - 尽量不要把话题死钉在「上班、写代码、赶作业」等工作学习叙事上，除非侧写里自然出现且和破冰强相关。
        - 尽量不要在问题里直接用传统心理学术语（如「神经质」「内向」等）点名对方。
        - 上面矩阵里的轴名是你内部用的「抓手」，成稿时**优先落到生活画面与隐喻**，避免生硬地把轴名拼进句子里做二元问卷口吻；若偶尔出现一个普通用词，不必刻意回避。

        隐喻参考（请举一反三，不要照抄本例）：
        - 欠佳：「你喜欢混沌还是秩序？」（太像照搬设定、像测评题）
        - 较好：「如果你的房间是一个微型宇宙，桌子上的杂物是随便漂浮，还是像博物馆一样贴着标签？」（把反差落到具体画面）

        风格：松弛、机智、有画面感，像有魅力的老朋友在搭话。
        {lang_clause}

        请严格遵守以下 JSON 格式返回，包含 3 个问题对象（id 请自行生成唯一字符串，如 "q1", "q2"）。
        每个问题的 `text` 必须使用上方【输出语言】中指定的唯一语言：
        ```json
        {{
            "questions": [
                {{"id": "q1", "text": "..."}},
                {{"id": "q2", "text": "..."}},
                {{"id": "q3", "text": "..."}}
            ]
        }}
        ```
        """
        # 强制要求模型输出 JSON
        raw_text = await _generate_json(prompt)
        # 清理可能存在的 Markdown 标记并解析
        clean_json_str = raw_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_json_str)
        
        # 约束：后端必须为每个问题生成唯一 id
        questions_raw = result.get("questions", [])
        seen_ids = set()
        questions = []
        for i, q in enumerate(questions_raw[:3]):  # 最多取 3 个
            qid = q.get("id") or q.get("questionId")
            text = q.get("text") or q.get("question", "")
            if not text:
                continue
            if not qid or qid in seen_ids:
                qid = f"q{uuid.uuid4().hex[:8]}"
            seen_ids.add(qid)
            questions.append({"id": qid, "text": text})
        
        return {"questions": questions}

    except Exception as e:
        print(f"❌ [AI] 生成问题失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/forge_profile")
async def forge_profile(data: ForgeProfilePayload):
    """
    【回合二】：综合 QA，按 Nexus 五轴修正 final_vector，生成三语 aiTopics/tags 与单语 animal_spirit（精神实体类短语）。
    """
    ui_lang = _normalize_ui_language(data.language)
    print(f"🧠 [AI] 正在为 {data.username} 锻造终极画像... (lang={ui_lang})")
    try:
        if not data.qa:
            raise HTTPException(status_code=400, detail="qa 不能为空")
        lang_clause = _output_language_clause(data.language)
        # 将用户的 QA 历史拼接成一段可读的上下文
        qa_context = "\n".join([f"问：{item.question}\n答：{item.answer}" for item in data.qa])

        imode = (data.input_mode or "mood").strip().lower()
        if imode not in ("camera", "mood"):
            imode = "mood"
        raw_b64 = (data.image_base64 or "").strip()
        prefill_raw = data.image_tag_prefill
        prefill_tri = None
        if imode == "camera" and prefill_raw is not None:
            if isinstance(prefill_raw, dict) and any(
                str(prefill_raw.get(k) or "").strip() for k in ("en", "cn", "zh", "jp", "ja")
            ):
                prefill_tri = _normalize_one_tag_tri(prefill_raw)
            elif isinstance(prefill_raw, str) and prefill_raw.strip():
                prefill_tri = _coerce_prefill_to_tag_tri(prefill_raw)
        use_prefill = prefill_tri is not None
        # 有预先的图 tag 时不再在 forge 送图（避免重复）；否则 camera 可用图片兜底
        use_image_multimodal = imode == "camera" and bool(raw_b64) and not use_prefill

        tri_obj = '{{"en": "…", "cn": "…", "jp": "…"}}'
        if use_prefill:
            safe_pref = (
                " / ".join(
                    str(x)
                    for x in (
                        (prefill_tri or {}).get("en"),
                        (prefill_tri or {}).get("cn"),
                        (prefill_tri or {}).get("jp"),
                    )
                    if x
                )[:220]
                .replace('"', "'")
            )
            tag_instruction = f"""
        【标签三语】`tags` 中每个元素必须是对象，包含 `en`, `cn`, `jp` 三个键，语义自然地道。
        **第一个视觉标签已在入场阶段固定**（参考：「{safe_pref}」），系统会自动合并。
        因此，你**只需输出 1 个**全新的标签对象。请**仅根据【深度对谈记录】**提炼 TA 的潜意识特质、兴趣切面或思想倾向，且尽量与固定标签的**维度错开**（避免同义重复）。
        """
            tags_json_example = f'"tags": [ {tri_obj} ]'
        elif use_image_multimodal:
            tag_instruction = f"""
        【标签三语】`tags` 必须是长度为 **2** 的数组；每项为对象，含 `en`, `cn`, `jp` 键。
        用户上传了照片。请分别输出：
        1) 第 1 项：**仅从图片**提炼其外在视觉气质/审美风格（尽量具象、有记忆点）；
        2) 第 2 项：**仅从【深度对谈记录】**提炼其内在倾向、兴趣或生活方式（可略抽象，但仍要少套话）。
        """
            tags_json_example = f'"tags": [ {tri_obj}, {tri_obj} ]'
        else:
            tag_instruction = f"""
        【标签三语】`tags` 必须是长度为 **2** 的数组；每项为对象，含 `en`, `cn`, `jp` 键。
        用户未提供照片：请**勿**编造视觉、衣着或场景画面；**仅依据【深度对谈记录】**提炼 2 个**不同维度**的标签
        （例如：一个侧重 Nexus 相关的心理/社交倾向，一个侧重具体兴趣或生活习惯，仅供参考，请自行组织语言）。
        """
            tags_json_example = f'"tags": [ {tri_obj}, {tri_obj} ]'

        prompt = f"""
        你现在是极客社交派对的「终极画像与向量锻造师」。
        用户 {data.username} (心情/状态: {data.mood or '（未填写）'})，参与方式：{"相机拍照" if imode == "camera" else "心情选择"}。
        {lang_clause}

        【语言与示例】下方若出现中文为主的举例，**仅用于说明风格与具象化程度**；所有面向用户的字段（含 JSON 键 `animal_spirit` 的值）必须严格遵循上方【输出语言】，不得因示例而混用其他语言。

        【深度对谈记录】：
        {qa_context}

        【核心基准：Nexus 潜意识投影矩阵】
        TA 的初始向量是：{data.ocean_vector}。
        五维顺序与系统一致，记为 V[0]..V[4]；请用以下视角理解（0 偏左，100 偏右），用于微调 `final_vector` 与编题灵感：
        V[0] 时间质感：历史沉淀与自然肌理 (低) <---> 未来感与人造流光 (高)
        V[1] 组织气质：感性、随意、解构 (低) <---> 理性、秩序、严丝合缝 (高)
        V[2] 社交能量：独处与低频连接 (低) <---> 热闹与高频互动 (高)
        V[3] 协作感：独行、游侠气 (低) <---> 合拍、互相接得住 (高)
        V[4] 信息负荷：极简、降噪 (低) <---> 繁复、多线程 (高)

        【任务一：潜意识向量微调】
        请根据 TA 在回答中展现的潜意识、审美与社交倾向，对上述五维做合理修正，输出 `final_vector`（恰好 5 个 0–100 的整数）。

        【任务二：生成破冰资料】
        1. `aiTopics`（给**其他参会者**看的「聊天抓手」，不是对回答者的追问）：
        - 长度为 **3** 的数组；每项为 `{{"en","cn","jp"}}` 三语对象，三面语义一致。
        - **受众**：陌生人之间搭讪用；上文用户名仅用于你理解画像，**禁止**写进 `aiTopics` 任何一条的正文。文案应是**建议开口方怎么聊**，而不是把问卷再访谈一遍。
        - **文风硬性约束**（三条的 en、cn、jp 全文都要遵守）：
            · 禁止出现用户名、昵称，以及用姓名或「他/她/TA」作主语的第三人称判词开头（例如「某某似乎/显得/看起来对…感兴趣」）。
            · **英文**：禁止以人名起句；禁止 *"[Name] seems/appears/is drawn to/looks like"* 等模板；每条须**直接**给出话题或极简建议（如 *"Discuss unexpected backstories of everyday objects."*）。
            · **中文**：避免「似乎对…感兴趣」「看得出来…」等总结式起笔；优先「可以从…聊到…」「试试聊…」「聊聊…」等**直给话题**。
            · **日文**：同样禁止「〜さんは〜のようだ」式姓名+评价起笔，应直写话题本身。
        - **禁止**：针对某一则 `answer` 做第二层盘问（例如拿「昏黄的灯光」追问「那盏灯具体什么样」）；不要用「想象一下」「如果让你」「你希望」等长篇追问链条；不要逐句复述或拷贝回答里的原词当题干。
        - **推荐**：**短**句，以**陈述或可借用的开场方向**为主（如「可以从光线、氛围聊到最近在看的片或听的歌」）；若出现问句，须是**给陌生人用的极简开场**，一两句话内说完，且不依赖对方刚答过的私密细节。
        - 结合【深度对谈记录】与 `final_vector` 所体现的 Nexus 气质，三条须**各不相同**，**具象、生活化**，少空话。
        2. `animal_spirit`：JSON **键名必须仍为** `animal_spirit`。值为一段极具画面感的**精神实体/气质比喻**（单语，遵守【输出语言】）；请基于对谈自行发明意象，**请勿**照抄本说明里的任何示例句。
        3. `tags`：按下文【标签三语】执行。
        {tag_instruction}

        请严格以 JSON 格式输出（不要改动键名）：
        ```json
        {{
            "final_vector": [80, 65, 90, 45, 70],
            "aiTopics": [
                {{"en": "A short, direct opener suggestion — no names, no \"seems/appears\"", "cn": "直给话题，不出现人名与「似乎/看起来」起句", "jp": "名前や「〜のようだ」評価なしで、短い会話の糸口のみ"}},
                {{"en": "...", "cn": "...", "jp": "..."}},
                {{"en": "...", "cn": "...", "jp": "..."}}
            ],
            "animal_spirit": "（极具画面感的短语，单语）",
            {tags_json_example}
        }}
        ```
        """
        raw_text = await _generate_json(
            prompt,
            image_base64=raw_b64 if use_image_multimodal else None,
            image_mime_type=data.image_mime_type if use_image_multimodal else None,
        )
        clean_json_str = raw_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_json_str)

        # 结合用户的动物精神或用户名，生成一个炫酷的头像 URL (此处使用 DiceBear 作为占位)
        seed = (result.get("animal_spirit") or data.username or "default").replace(" ", "") or "default"
        avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={seed}"

        # 校验并修正 final_vector：长度 5，0-100 整数
        raw_vec = result.get("final_vector", data.ocean_vector)
        if not isinstance(raw_vec, list) or len(raw_vec) != 5:
            final_vector = list(data.ocean_vector) if len(data.ocean_vector) == 5 else [50, 50, 50, 50, 50]
        else:
            try:
                final_vector = [max(0, min(100, int(float(x)))) for x in raw_vec[:5]]
            except (ValueError, TypeError):
                final_vector = [50, 50, 50, 50, 50]

        raw_tag_list = result.get("tags", [])
        if use_prefill:
            second = _normalize_one_tag_tri(raw_tag_list[0] if raw_tag_list else {})
            if second == _fallback_tag_tri() and len(raw_tag_list) > 1:
                second = _normalize_one_tag_tri(raw_tag_list[1])
            tags = [prefill_tri, second]
        else:
            tags = _normalize_two_tags_trilingual(raw_tag_list)
        ai_topics = _normalize_ai_topics_trilingual(result.get("aiTopics", []))

        # —— 终端可读的「画像/看图」结果摘要（便于调试多模态）——
        img_kb = 0
        if use_image_multimodal and raw_b64:
            try:
                img_kb = len(base64_module.b64decode(raw_b64, validate=False)) // 1024
            except Exception:
                img_kb = 0
        print("\n" + "=" * 62)
        print(f"📋 [AI] forge_profile | user={data.username} | id={data.participant_id}")
        print(f"   参与方式: {imode} | 图tag预填: {'是' if use_prefill else '否'} | 本请求多模态看图: {'是' if use_image_multimodal else '否'}", end="")
        if use_image_multimodal:
            print(f" | 约 {img_kb} KB | MIME={_safe_image_mime(data.image_mime_type)}")
        else:
            print()
        print(f"   模型返回的原始 tags: {result.get('tags')}")
        if use_prefill:
            print(f"   → [① 拍照阶段·固定] {tags[0]}")
            print(f"   → [② forge·仅回答] {tags[1]}")
        elif use_image_multimodal:
            print(f"   → [① 多模态·图] {tags[0]}")
            print(f"   → [② 回答] {tags[1]}")
        else:
            print(f"   → [① 来自回答·维度1] {tags[0]}")
            print(f"   → [② 来自回答·维度2] {tags[1]}")
        print(f"   aiTopics (3×三语): {ai_topics}")
        print(f"   animal_spirit: {result.get('animal_spirit', '')}")
        print(f"   final_vector: {final_vector}")
        print("=" * 62 + "\n")

        final_payload = {
            "aiTopics": ai_topics,
            "animal_spirit": result.get("animal_spirit", ""),
            "avatarUrl": avatar_url,
            "final_vector": final_vector,
            "tags": tags
        }

        return final_payload

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [AI] 锻造画像失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/compare_tags")
async def compare_tags(data: CompareTagsPayload):
    """
    批量计算 source_tags 与每个 targets[i] 的 tag 相似度（跨语言、兼顾泛标签与亚文化语境）。
    返回 0-100 的 scores 数组，与 targets 顺序一致。
    """
    if not data.source_tags or not data.targets:
        return {"scores": []}
    try:
        src = _coerce_two_tag_strings(list(data.source_tags))
        user_str = _format_tags_for_compare_lines(src)
        lines_user_b = []
        for i, tgt in enumerate(data.targets):
            pair = _coerce_two_tag_strings(list(tgt))
            lines_user_b.append(f"用户 {i+1}：{_format_tags_for_compare_lines(pair)}")
        targets_str = "\n".join(lines_user_b)
        target_count = len(data.targets)
        # 动态示例：长度与 target_count 一致，避免模型照抄错误长度
        demo_scores = [
            max(8, min(94, 52 + ((i * 23 + target_count * 7) % 41))) for i in range(target_count)
        ]
        score_format_example = json.dumps({"scores": demo_scores}, ensure_ascii=False)

        prompt = f"""
        你是一个专为极客社交设计的「跨语言语义共鸣评分器」。
        在**跨语言**前提下，综合评估两组标签在兴趣气质、审美与生活方式上的契合度，并兼顾「极客/亚文化/网络梗」等加分语境；输出 0–100 分。

        【评分刻度（请拉开区分度，但避免全员极端）】
        - 90–100：语义高度贴近，或在极客/亚文化语境下有强烈「对得上号」的感觉（可跨语言，如含义互通的圈层梗）。
        - 60–89：有明显话题交集或同一大类下的共鸣，聊得起来。
        - 35–59：没有硬蹭的同义词，但气质、情绪或生活取向不违和，或一方泛标签与另一方可温和衔接。
        - 10–34：关联很弱，仅有极淡的泛泛交集。
        - 0–9：语义冲突、完全无关，或画风硬抵触时再给极低分；**不要**仅因「不够极客」就把宽泛日常标签一律打到 0–20。

        【泛标签与极客标签的平衡】
        若双方多为日常、宽泛词（如心情、咖啡、松弛、简约），请按**情绪氛围、生活品味、松弛/秩序感**等维度给合理中段分，不必强行套用亚文化梗。
        若出现明确极客/亚文化指向，再在上述基础上**合理上浮**；不要把「不够宅」当成低分唯一理由。

        【待评估数据】（共 {target_count} 位待比较用户，须产出 {target_count} 个分数，顺序与编号一致）
        用户 A 的两个标签：{user_str}

        待比较列表：
        {targets_str}

        【输出约束】
        1. 仅输出**一段合法 JSON**，不要额外说明文字。
        2. JSON 顶层对象必须包含键 `"scores"`，值为整数数组。
        3. `scores.length` 必须**精确等于** {target_count}，且第 i 个分数对应「用户 i」。

        以下为**结构与长度**示范（数组内数字为占位，请按你对每个用户的真实判断重新填写）：
        ```json
        {score_format_example}
        ```
        """
        raw_text = await _generate_json(prompt)
        clean = raw_text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        scores = parsed if isinstance(parsed, list) else parsed.get("scores", [])
        # 归一化到 0-100
        result = []
        for s in scores[:len(data.targets)]:
            try:
                v = max(0, min(100, int(float(s))))
            except (ValueError, TypeError):
                v = 50
            result.append(v)
        while len(result) < len(data.targets):
            result.append(50)
        return {"scores": result}
    except Exception as e:
        print(f"❌ [AI] compare_tags 失败: {e}")
        traceback.print_exc()
        return {"scores": [50] * len(data.targets)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
