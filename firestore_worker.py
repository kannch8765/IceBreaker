"""
Firestore Dual-Core Worker - 桥接 IceBreaker 前端与 Python 后端

监听 Firestore 中两个核心状态：
1. generating_questions -> 调用后端生成问题 -> 写入 answering
2. waiting_for_ai -> 调用后端生成画像 -> 写入 ready + 全连接亲和度匹配

运行前：
1. 确保 .env 中配置了 GOOGLE_APPLICATION_CREDENTIALS
2. pip install firebase-admin requests python-dotenv

可选环境变量：
- WORKER_MAX_THREADS：并发线程数，默认 10
- WORKER_POLL_SECONDS：轮询间隔（秒），默认 1
"""
import os
import math
import time
import base64
import threading
import requests
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

# 代理配置（访问 Firestore 需翻墙时使用，与 main.py 一致）
_proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy") or "http://127.0.0.1:7890"
if _proxy:
    os.environ["http_proxy"] = _proxy
    os.environ["https_proxy"] = _proxy
    os.environ["grpc_proxy"] = _proxy
    print(f"[Worker] 使用代理: {_proxy}")

from firebase_admin import initialize_app, credentials, firestore

# 后端 API 地址
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "gdg-hackathon-2026-aquila314-877776c7887b.json")

# 单进程并发：I/O 密集任务用线程池；跨房间并行，同一 (room, participant) 不重复入队
WORKER_MAX_THREADS = max(1, int(os.getenv("WORKER_MAX_THREADS", "10")))
WORKER_POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "1"))

executor = ThreadPoolExecutor(max_workers=WORKER_MAX_THREADS, thread_name_prefix="fs_worker")
# 键为 "room_id:participant_id"，避免不同房间同 id 误判为同一人
processing_ids: set[str] = set()
memory_lock = threading.Lock()

# 同一房间内 waiting_for_ai 会批量改多人 affinities，必须串行，否则会「读后写」互相覆盖
_room_ai_locks: dict[str, threading.Lock] = {}
_room_locks_guard = threading.Lock()


def _task_key(room_id: str, participant_id: str) -> str:
    return f"{room_id}:{participant_id}"


def _get_room_ai_lock(room_id: str) -> threading.Lock:
    with _room_locks_guard:
        lock = _room_ai_locks.get(room_id)
        if lock is None:
            lock = threading.Lock()
            _room_ai_locks[room_id] = lock
        return lock

# 仅允许从 Firebase Storage 域名拉图，防止 SSRF
_ALLOWED_IMAGE_NETLOCS = frozenset(
    {
        "firebasestorage.googleapis.com",
        "firebasestorage.app",
    }
)
_MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_FETCH_BYTES", str(10 * 1024 * 1024)))


def _detect_image_mime(body: bytes, content_type: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        return ct
    if len(body) >= 3 and body[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(body) >= 8 and body[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(body) >= 12 and body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "image/webp"
    if len(body) >= 6 and body[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return "image/jpeg"


def fetch_image_base64_from_url(url: str):
    """
    从 Firebase Storage HTTPS URL 下载图片，返回 (base64_str, mime_type) 或 (None, None)。
    """
    if not url or not isinstance(url, str):
        return None, None
    url = url.strip()
    try:
        parsed = urlparse(url)
    except Exception:
        return None, None
    if parsed.scheme not in ("https",):
        print(f"[Worker] imageUrl 非 https，跳过: {parsed.scheme}")
        return None, None
    host = (parsed.netloc or "").lower()
    if ":" in host:
        host = host.split(":")[0]
    if host not in _ALLOWED_IMAGE_NETLOCS and not host.endswith(".firebasestorage.app"):
        print(f"[Worker] imageUrl 域名不在允许列表，跳过: {host}")
        return None, None
    try:
        r = requests.get(url, timeout=25, stream=True)
        r.raise_for_status()
        buf = bytearray()
        for chunk in r.iter_content(65536):
            if not chunk:
                continue
            buf.extend(chunk)
            if len(buf) > _MAX_IMAGE_BYTES:
                print("[Worker] 图片超过大小上限，跳过")
                return None, None
        body = bytes(buf)
        if not body:
            return None, None
        mime = _detect_image_mime(body, r.headers.get("Content-Type", ""))
        b64 = base64.b64encode(body).decode("ascii")
        print(f"🖼️ [Worker] 图片下载完成: {len(body)} bytes (~{len(body) // 1024} KB), mime={mime}")
        return b64, mime
    except Exception as e:
        print(f"[Worker] 拉取 imageUrl 失败: {e}")
        return None, None


def _fallback_tag_tri():
    return {"en": "general", "cn": "一般", "jp": "一般"}


def _normalize_one_tag_tri(raw):
    """单条 tag → {{en,cn,jp}}；与 main.py 一致（供 compare_tags / Firestore）。"""
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


def normalize_tags_list(tags):
    """2 个三语标签对象，与 main.py forge 输出一致（供 compare_tags）。"""
    if not tags:
        tags = []
    out = [_normalize_one_tag_tri(t) for t in tags[:2]]
    while len(out) < 2:
        out.append(_fallback_tag_tri())
    return out


def _normalize_viewer_language(code):
    """与前端 language 一致：en | jp | cn"""
    if not code:
        return "en"
    c = str(code).lower().strip()
    if c in ("jp", "ja"):
        return "jp"
    if c in ("cn", "zh", "zh-cn", "zh_cn"):
        return "cn"
    return "en"


def _pick_localized_from_trilingual(raw, viewer_lang: str) -> str:
    """
    raw: 字符串 或 {{en,cn,jp}} 对象（与 aiTopics 单项 / tag 同形）。
    按「当前查看者」语言取一条展示文案。
    """
    tri = _normalize_one_tag_tri(raw)
    lang = _normalize_viewer_language(viewer_lang)
    if lang == "jp":
        return tri.get("jp") or tri.get("cn") or tri.get("en") or ""
    if lang == "cn":
        return tri.get("cn") or tri.get("en") or tri.get("jp") or ""
    return tri.get("en") or tri.get("cn") or tri.get("jp") or ""


def _localize_ai_topics_for_viewer(raw_list, viewer_lang: str):
    """对方完整 aiTopics → 查看者语言下的 3 条字符串。"""
    out = []
    if isinstance(raw_list, list):
        for item in raw_list[:3]:
            out.append(_pick_localized_from_trilingual(item, viewer_lang))
    while len(out) < 3:
        out.append("")
    return out


def _localize_tags_for_viewer(raw_list, viewer_lang: str):
    """对方 tags → 查看者语言下的 2 条字符串。"""
    out = []
    if isinstance(raw_list, list):
        for t in raw_list[:2]:
            out.append(_pick_localized_from_trilingual(t, viewer_lang))
    while len(out) < 2:
        out.append(_pick_localized_from_trilingual(_fallback_tag_tri(), viewer_lang))
    return out


def calculate_affinity(vec1, vec2):
    """根据大五向量计算亲和度 (0-100)，向量长度必须一致且为 5"""
    if not vec1 or not vec2:
        return 0
    if len(vec1) != 5 or len(vec2) != 5:
        return 0
    dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(vec1, vec2)))
    score = max(0, 100 - (dist / 2.23))
    return int(score)


def build_matched_participant(participants_ref, my_affinities: dict, viewer_language: str = "en"):
    """
    从本用户（查看者）的 affinities 中取分数最高的对方，拉取展示字段。
    不包含 animal_spirit；aiTopics / tags 为「对方数据」在「查看者语言」下的字符串列表。
    同分按 participantId 字典序稳定决胜。
    返回 dict 或 None（无其他 ready 用户时）。
    """
    if not my_affinities:
        return None
    best_id = max(my_affinities.keys(), key=lambda k: (my_affinities[k], k))
    score = int(my_affinities[best_id])
    vlang = viewer_language
    try:
        snap = participants_ref.document(best_id).get()
        if snap.exists:
            d = snap.to_dict() or {}
            topics_loc = _localize_ai_topics_for_viewer(d.get("aiTopics"), vlang)
            tags_loc = _localize_tags_for_viewer(d.get("tags"), vlang)
            return {
                "participantId": best_id,
                "affinityScore": score,
                "username": d.get("username") or "",
                "avatarUrl": d.get("avatarUrl") or "",
                "aiTopics": topics_loc,
                "tags": tags_loc,
            }
    except Exception as e:
        print(f"⚠️ [Worker] 读取最佳匹配用户 {best_id} 失败: {e}")
    return {
        "participantId": best_id,
        "affinityScore": score,
        "username": "",
        "avatarUrl": "",
        "aiTopics": ["", "", ""],
        "tags": ["", ""],
    }


def refresh_matched_participants_after_affinity_change(db, participants_ref, participant_ids):
    """
    affinities 已写入 Firestore 后调用：对列表内每位 status=ready 的用户
    根据当前完整 affinities 重算并更新 matchedParticipant（每人独立最高分）。
    """
    unique_ids = list(dict.fromkeys(participant_ids))
    batch = db.batch()
    n = 0
    for pid in unique_ids:
        ref = participants_ref.document(pid)
        snap = ref.get()
        if not snap.exists:
            continue
        d = snap.to_dict() or {}
        if d.get("status") != "ready":
            continue
        aff = d.get("affinities") or {}
        viewer_lang = d.get("language") or "en"
        mp = build_matched_participant(participants_ref, aff, viewer_lang)
        batch.update(ref, {"matchedParticipant": mp})
        n += 1
    if n > 0:
        batch.commit()
    return n


def init_firebase():
    try:
        from firebase_admin import get_app
        get_app()
    except ValueError:
        cred = credentials.Certificate(CREDENTIALS_PATH)
        initialize_app(cred)

def process_generating_questions(doc_ref, room_id: str, participant_id: str, data: dict):
    """回合一：可选 analyze_vibe（仅 camera）→ generate_questions"""
    print(f"🏓 [Worker-step1] 正在为 {participant_id} 生成破冰问题...")
    try:
        # 1. 上锁！防止下一秒的轮询重复抓取
        doc_ref.update({"status": "processing_questions"})

        input_mode = (data.get("inputMode") or data.get("input_mode") or "mood").strip().lower()
        if input_mode not in ("camera", "mood"):
            input_mode = "mood"

        vibe_analysis = ""
        image_tag = None

        # 2a. camera：第一轮多模态 analyze_vibe → 写入 vibe_analysis + image_tag（mood 不调、不产生 tag）
        if input_mode == "camera":
            img_url = data.get("imageUrl") or data.get("image_url")
            b64, mime = (None, None)
            if img_url:
                b64, mime = fetch_image_base64_from_url(img_url)
            if b64:
                try:
                    print(f"🎬 [Worker] 第一轮 analyze_vibe participant={participant_id}")
                    ar = requests.post(
                        f"{BACKEND_URL}/api/analyze_vibe",
                        json={
                            "room_id": room_id,
                            "participant_id": participant_id,
                            "username": data.get("username", ""),
                            "mood": data.get("mood", ""),
                            "input_mode": "camera",
                            "language": data.get("language", "en"),
                            "image_base64": b64,
                            "image_mime_type": mime or "image/jpeg",
                        },
                        timeout=90,
                    )
                    ar.raise_for_status()
                    body = ar.json()
                    vibe_analysis = (body.get("vibe_analysis") or "").strip()
                    raw_itag = body.get("image_tag")
                    image_tag = None
                    if isinstance(raw_itag, dict) and any(
                        str(raw_itag.get(k) or "").strip() for k in ("en", "cn", "jp", "zh", "ja")
                    ):
                        image_tag = _normalize_one_tag_tri(raw_itag)
                    elif isinstance(raw_itag, str) and raw_itag.strip():
                        s = raw_itag.strip()
                        image_tag = {"en": s, "cn": s, "jp": s}
                    patch = {}
                    if vibe_analysis:
                        patch["vibe_analysis"] = vibe_analysis
                    if image_tag:
                        patch["image_tag"] = image_tag
                    if patch:
                        doc_ref.update(patch)
                    print(f"✅ [Worker] analyze_vibe 已写入 Firestore | tag={image_tag!r}")
                except Exception as ex:
                    print(f"⚠️ [Worker] analyze_vibe 失败，将仅按心情/向量出题: {ex}")

        # 2b. 第二轮：生成问题（mood 仅用心情+向量；camera 附加 vibe_analysis）
        payload = {
            "room_id": room_id,
            "participant_id": participant_id,
            "username": data.get("username", ""),
            "mood": data.get("mood", ""),
            "pronoun": data.get("pronoun", ""),
            "ocean_vector": data.get("ocean_vector", [50, 50, 50, 50, 50]),
            "language": data.get("language", "en"),
            "input_mode": input_mode,
            "vibe_analysis": vibe_analysis,
        }

        resp = requests.post(f"{BACKEND_URL}/api/generate_questions", json=payload, timeout=90)
        resp.raise_for_status()
        result = resp.json()

        # 3. 写入数据库，交出控制权 (状态改为 answering)
        doc_ref.update({
            "status": "answering",
            "questions": result.get("questions", [])
        })
        print(f"✅ [Worker-step2] 成功写入问题，等待用户回答 ({participant_id})")

    except Exception as e:
        print(f"❌ [Worker-错误] 生成问题失败 {participant_id}: {e}")
        doc_ref.update({"status": "error", "errorMessage": f"生成问题失败: {str(e)}"})


def process_waiting_for_ai(doc_ref, room_id: str, participant_id: str, data: dict, db):
    """回合二：处理用户 QA 答案，生成终极画像 + 全连接亲和度匹配"""
    print(f"🏓 [Worker] 正在为 {participant_id} 锻造终极画像...")
    try:
        doc_ref.update({"status": "processing_ai"})

        # 1. 带上初始数组去请求 FastAPI（camera + imageUrl 时拉取图片送多模态）
        input_mode = (data.get("inputMode") or data.get("input_mode") or "mood").strip().lower()
        if input_mode not in ("camera", "mood"):
            input_mode = "mood"

        # Firestore 字段为 inputMode，API 为 input_mode
        payload = {
            "room_id": room_id,
            "participant_id": participant_id,
            "username": data.get("username", ""),
            "mood": data.get("mood", ""),
            "qa": data.get("qa", []),
            "ocean_vector": data.get("ocean_vector", [50, 50, 50, 50, 50]),
            "language": data.get("language", "en"),
            "input_mode": input_mode,
        }
        if data.get("image_base64"):
            payload["image_base64"] = data["image_base64"]
            payload["image_mime_type"] = data.get("image_mime_type", "image/jpeg")

        itag = data.get("image_tag")
        if isinstance(itag, dict) and any(
            str(itag.get(k) or "").strip() for k in ("en", "cn", "jp", "zh", "ja")
        ):
            payload["image_tag_prefill"] = _normalize_one_tag_tri(itag)
        elif isinstance(itag, str) and itag.strip():
            payload["image_tag_prefill"] = itag.strip()

        # 仅有 camera 且 **没有** 第一轮图 tag 时，才在 forge 拉图做多模态兜底（旧数据/分析失败）
        if input_mode == "camera" and not itag and not payload.get("image_base64"):
            img_url = data.get("imageUrl") or data.get("image_url")
            if img_url:
                b64, mime = fetch_image_base64_from_url(img_url)
                if b64:
                    payload["image_base64"] = b64
                    payload["image_mime_type"] = mime or "image/jpeg"
                    print(f"🏞 [Worker] forge 兜底：已从 imageUrl 拉取图片 ({mime})")
                else:
                    print("⚠️ [Worker] camera 且无 image_tag，imageUrl 拉取失败，forge 将两 tag 均来自回答")

        print(f"⏳ [Worker] 调用 forge_profile（最长约 120s）participant={participant_id} input_mode={input_mode}")
        resp = requests.post(f"{BACKEND_URL}/api/forge_profile", json=payload, timeout=120)
        resp.raise_for_status()
        result = resp.json()

        # 与 main 端摘要对照：Worker 再打一行的 tags / topics
        _tags = result.get("tags", [])
        _topics = result.get("aiTopics", [])
        print(f"✅ [Worker] forge_profile 返回 tags={_tags} | aiTopics 条数={len(_topics) if isinstance(_topics, list) else 0}")

        new_vector = result.get("final_vector", payload["ocean_vector"])
        # API 返回的 tags 已为字符串列表；normalize 用于兼容旧文档
        my_tags = normalize_tags_list(result.get("tags", []))

        # 2. 收集所有已 ready 用户
        participants_ref = db.collection("rooms").document(room_id).collection("participants")
        all_ready_users = list(participants_ref.where("status", "==", "ready").stream())

        # 3. 批量获取 tag 相似度
        targets_tags = []
        ready_list = []
        for u in all_ready_users:
            if u.id != participant_id:
                old_data = u.to_dict()
                targets_tags.append(normalize_tags_list(old_data.get("tags", [])))
                ready_list.append((u.reference, old_data))

        tag_scores = {}
        if targets_tags:
            try:
                tag_resp = requests.post(
                    f"{BACKEND_URL}/api/compare_tags",
                    json={"source_tags": my_tags, "targets": targets_tags},
                    timeout=30,
                )
                if tag_resp.ok:
                    scores = tag_resp.json().get("scores", [])
                    for i, (ref, _) in enumerate(ready_list):
                        tag_scores[ref.id] = scores[i] if i < len(scores) else 50
                else:
                    for ref, _ in ready_list:
                        tag_scores[ref.id] = 50
            except Exception as e:
                print(f"⚠️ [Worker] compare_tags 失败，使用默认 50: {e}")
                for ref, _ in ready_list:
                    tag_scores[ref.id] = 50

        # 4. 融合：final_score = 0.7 * vector_affinity + 0.3 * tag_score
        batch = db.batch()
        my_affinities = {}

        for (u_ref, old_data), target_tags in zip(ready_list, targets_tags):
            old_vector = old_data.get("final_vector")
            vector_score = calculate_affinity(new_vector, old_vector) if old_vector else 50
            tag_score = tag_scores.get(u_ref.id, 50)
            final_score = int(0.7 * vector_score + 0.3 * tag_score)
            my_affinities[u_ref.id] = final_score
            old_affinities = old_data.get("affinities", {})
            old_affinities[participant_id] = final_score
            batch.update(u_ref, {"affinities": old_affinities})

        # 5. 更新自己（matchedParticipant 在 commit 后统一刷新，保证老人也拿到新人后的最高分）
        self_update = {
            "status": "ready",
            "aiTopics": result.get("aiTopics", []),
            "avatarUrl": result.get("avatarUrl", ""),
            "final_vector": new_vector,
            "tags": my_tags,
            "affinities": my_affinities,
        }
        batch.update(doc_ref, self_update)
        batch.commit()
        print(f"🔥 [Worker] 全连接写入完成！修改了自己 + {len(my_affinities)} 个前浪的文档！")

        # 6. 新人 + 所有刚被更新 affinities 的 ready 用户：重算 matchedParticipant
        affected_ids = [participant_id] + [ref.id for ref, _ in ready_list]
        refreshed = refresh_matched_participants_after_affinity_change(
            db, participants_ref, affected_ids
        )
        print(f"🔄 [Worker] matchedParticipant 已刷新 {refreshed} 位用户（含新人与在场前浪）")
        try:
            me = participants_ref.document(participant_id).get()
            if me.exists:
                mp = (me.to_dict() or {}).get("matchedParticipant")
                if mp:
                    print(
                        f"🎯 [Worker] 新人当前最佳匹配: {mp.get('participantId')} "
                        f"score={mp.get('affinityScore')}"
                    )
        except Exception as exc:
            print(f"⚠️ [Worker] 读取新人 matchedParticipant 摘要失败: {exc}")

    except Exception as e:
        print(f"❌ [Worker] 锻造画像失败 {participant_id}: {e}")
        doc_ref.update({"status": "error", "errorMessage": str(e)})


def safe_process_questions(doc_ref, room_id: str, participant_id: str, data: dict):
    try:
        process_generating_questions(doc_ref, room_id, participant_id, data)
    finally:
        with memory_lock:
            processing_ids.discard(_task_key(room_id, participant_id))


def safe_process_ai(doc_ref, room_id: str, participant_id: str, data: dict, db):
    # 整段 forge + batch 在同一房间互斥，避免 affinities 并发丢失更新
    try:
        with _get_room_ai_lock(room_id):
            process_waiting_for_ai(doc_ref, room_id, participant_id, data, db)
    finally:
        with memory_lock:
            processing_ids.discard(_task_key(room_id, participant_id))


def poll_participants(db):
    """双核轮询：同时盯着两个触发状态，跳过已关闭房间"""
    rooms_ref = db.collection("rooms")
    rooms = rooms_ref.stream()
    
    for room in rooms:
        room_id = room.id
        room_data = room.to_dict()
        room_status = room_data.get("status", "unknown")
        if room_status == "closed":
            continue  # 跳过已关闭房间
        participants_ref = rooms_ref.document(room_id).collection("participants")

        # --- 抓取任务 1: 需要生成问题的用户 ---
        pending_qs = participants_ref.where("status", "==", "generating_questions").stream()
        for doc in pending_qs:
            pid = doc.id
            key = _task_key(room_id, pid)
            with memory_lock:
                if key in processing_ids:
                    continue
                processing_ids.add(key)
            executor.submit(
                safe_process_questions,
                doc.reference,
                room_id,
                pid,
                doc.to_dict(),
            )

        # --- 抓取任务 2: 答完题等待 AI 的用户 ---
        pending_ai = participants_ref.where("status", "==", "waiting_for_ai").stream()
        for doc in pending_ai:
            pid = doc.id
            key = _task_key(room_id, pid)
            with memory_lock:
                if key in processing_ids:
                    continue
                processing_ids.add(key)
            executor.submit(
                safe_process_ai,
                doc.reference,
                room_id,
                pid,
                doc.to_dict(),
                db,
            )


def main():
    init_firebase()
    db = firestore.client()
    print(
        f"🚀 [Worker] 启动！双核监听 + 单进程并发（线程数={WORKER_MAX_THREADS}，"
        f"轮询间隔={WORKER_POLL_SECONDS}s）..."
    )
    print("👀 正在盯梢: generating_questions & waiting_for_ai")
    print(f"🔗 后端大脑: {BACKEND_URL}")
    print("ℹ️  处理 forge_profile（含下载大图/多模态）时可能 1～3 分钟无新日志，属正常；每分钟会打一次心跳。")

    last_heartbeat = time.monotonic()
    while True:
        try:
            poll_participants(db)
        except Exception as e:
            print(f"⚠️ [Worker] 轮询网络波动: {e}")
        now = time.monotonic()
        if now - last_heartbeat >= 60:
            print(f"💓 [Worker] 心跳 {time.strftime('%H:%M:%S')} — 轮询运行中（若长时间停在某条任务上，多半是在等 FastAPI/Gemini 或 Firestore）")
            last_heartbeat = now
        time.sleep(WORKER_POLL_SECONDS)


if __name__ == "__main__":
    main()
