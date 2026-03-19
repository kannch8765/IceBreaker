from fastapi import FastAPI, HTTPException
import uvicorn
import os
import json
import uuid
import asyncio
import traceback
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

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


async def _generate_json(prompt: str, response_mime_type: str = "application/json") -> str:
    """统一调用 Gemini，返回 JSON 字符串"""
    if _use_api_key:
        def _sync_gen():
            response = _model.generate_content(
                prompt,
                generation_config={"response_mime_type": response_mime_type}
            )
            return response.text
        return await asyncio.to_thread(_sync_gen)
    else:
        response = await _model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": response_mime_type}
        )
        return response.text


# ==========================================
# 2. 严格的 Pydantic 数据契约
# ==========================================

# --- 接口 A 的输入模型 ---
class GenerateQuestionsPayload(BaseModel):
    room_id: str
    participant_id: str
    username: str
    mood: str
    pronoun: Optional[str] = ""

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


# ==========================================
# 2. 核心 AI 接口
# ==========================================

@app.post("/api/generate_questions")
async def generate_questions(data: GenerateQuestionsPayload):
    """
    【回合一】：根据用户的初始状态，生成 2-3 个刁钻的破冰问题
    """
    print(f" [AI] 正在为 {data.username} 构思问题...")
    try:
        prompt = f"""
        你是一个专为 Google Hackathon 打造的 AI 社交破冰主理人。
        当前有一个新用户加入活动：
        - 称呼：{data.username}
        - 代词：{data.pronoun if data.pronoun else "TA"}
        - 进场心情/状态：{data.mood}

        请根据这些极其有限的线索，发挥极客幽默，为 {data.username} 生成 3 个截然不同的非典型"脑洞问题"，用于挖掘 TA 的真实性格。
        问题风格要求：机智、洞察力极强、带点科技或生活荒诞色彩，绝对不生硬不说教。

        请严格遵守以下 JSON 格式返回，包含 3 个问题对象（id 请自行生成唯一字符串，如 "q1", "q2"）：
        ```json
        {{
            "questions": [
                {{"id": "q1", "text": "你的第一个问题内容..."}},
                {{"id": "q2", "text": "你的第二个问题内容..."}},
                {{"id": "q3", "text": "你的第三个问题内容..."}}
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
    【回合二】：综合所有问答历史，生成最终的破冰话题和头像
    """
    print(f"[AI] 正在为 {data.username} 锻造终极画像...")
    try:
        # 将用户的 QA 历史拼接成一段可读的上下文
        qa_context = "\n".join([f"问：{item.question}\n答：{item.answer}" for item in data.qa])

        prompt = f"""
        你现在是黑客松的"终极画像锻造师"。
        用户 {data.username} (心情: {data.mood}) 刚刚完成了你的深度对谈。
        
        【深度对谈记录】：
        {qa_context}

        【你的任务】：
        基于 TA 的回答，提炼出最能代表 TA 的特质，并输出以下内容：
        1. `aiTopics`: 为其他参会者生成 3 个绝佳的搭讪/破冰话题（直接给话题短句，比如 "聊聊TA对赛博朋克的执念"）。
        2. `animal_spirit`: 用一个极具画面感的短语描述最符合 TA 的"动物精神"（例如 "敲键盘的赛博水豚"、"喝冰美式的树懒"）。

        请严格以 JSON 格式输出：
        ```json
        {{
            "aiTopics": ["话题1", "话题2", "话题3"],
            "animal_spirit": "..."
        }}
        ```
        """
        raw_text = await _generate_json(prompt)
        clean_json_str = raw_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_json_str)

        # 结合用户的动物精神或用户名，生成一个炫酷的头像 URL (此处使用 DiceBear 作为占位)
        # 如果你们后续接了 Nano Banana 2 图像生成，可以在这里替换逻辑！
        seed = result.get("animal_spirit", data.username).replace(" ", "")
        avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={seed}"
        
        # 组装最终返回给 Worker 的数据
        final_payload = {
            "aiTopics": result.get("aiTopics", []),
            "animal_spirit": result.get("animal_spirit", ""),
            "avatarUrl": avatar_url
        }

        return final_payload

    except Exception as e:
        print(f"❌ [AI] 锻造画像失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)