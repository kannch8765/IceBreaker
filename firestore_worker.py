"""
Firestore Dual-Core Worker - 桥接 IceBreaker 前端与 Python 后端

监听 Firestore 中两个核心状态：
1. generating_questions -> 调用后端生成问题 -> 写入 answering
2. waiting_for_ai -> 调用后端生成画像 -> 写入 ready

运行前：
1. 确保 .env 中配置了 GOOGLE_APPLICATION_CREDENTIALS
2. pip install firebase-admin requests python-dotenv
"""
import os
import time
import requests
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

def init_firebase():
    try:
        from firebase_admin import get_app
        get_app()
    except ValueError:
        cred = credentials.Certificate(CREDENTIALS_PATH)
        initialize_app(cred)

def process_generating_questions(doc_ref, room_id: str, participant_id: str, data: dict):
    """回合一：处理初始信息，生成问题"""
    print(f"🏓 [Worker-step1] 正在为 {participant_id} 生成破冰问题...")
    try:
        # 1. 上锁！防止下一秒的轮询重复抓取
        doc_ref.update({"status": "processing_questions"})

        # 2. 组装发给后端的 payload
        payload = {
            "room_id": room_id,
            "participant_id": participant_id,
            "username": data.get("username", ""),
            "mood": data.get("mood", ""),
            "pronoun": data.get("pronoun", "")
        }
        
        # 3. 呼叫后端 FastAPI
        resp = requests.post(f"{BACKEND_URL}/api/generate_questions", json=payload, timeout=60)
        resp.raise_for_status()
        result = resp.json()

        # 4. 写入数据库，交出控制权 (状态改为 answering)
        doc_ref.update({
            "status": "answering",
            "questions": result.get("questions", [])
        })
        print(f"✅ [Worker-step2] 成功写入问题，等待用户回答 ({participant_id})")

    except Exception as e:
        print(f"❌ [Worker-错误] 生成问题失败 {participant_id}: {e}")
        doc_ref.update({"status": "error", "errorMessage": f"生成问题失败: {str(e)}"})


def process_waiting_for_ai(doc_ref, room_id: str, participant_id: str, data: dict):
    """回合二：处理用户 QA 答案，生成终极画像"""
    print(f"🏓 [Worker-step3] 正在为 {participant_id} 锻造最终画像...")
    try:
        # 1. 上锁！
        doc_ref.update({"status": "processing_ai"})

        # 2. 组装发给后端的 payload (这里要带上前端极其规范的 qa 数组)
        payload = {
            "room_id": room_id,
            "participant_id": participant_id,
            "username": data.get("username", ""),
            "mood": data.get("mood", ""),
            "qa": data.get("qa", [])  # 这里是包含问题上下文和答案的数组
        }
        
        # 3. 呼叫后端 FastAPI
        resp = requests.post(f"{BACKEND_URL}/api/forge_profile", json=payload, timeout=60)
        resp.raise_for_status()
        result = resp.json()

        # 4. 终极落库，比赛结束 (状态改为 ready)
        doc_ref.update({
            "status": "ready",
            "aiTopics": result.get("aiTopics", []),
            "avatarUrl": result.get("avatarUrl", "")
        })
        print(f"🏆 [Worker-成功] {participant_id} 的大屏雷达已点亮！")

    except Exception as e:
        print(f"❌ [Worker-错误] 锻造画像失败 {participant_id}: {e}")
        doc_ref.update({"status": "error", "errorMessage": f"生成画像失败: {str(e)}"})


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
            process_generating_questions(doc.reference, room_id, doc.id, doc.to_dict())

        # --- 抓取任务 2: 答完题等待 AI 的用户 ---
        pending_ai = participants_ref.where("status", "==", "waiting_for_ai").stream()
        for doc in pending_ai:
            process_waiting_for_ai(doc.reference, room_id, doc.id, doc.to_dict())


def main():
    init_firebase()
    db = firestore.client()
    print("🚀 [Worker] 启动！双核监听模式已开启...")
    print("👀 正在盯梢: generating_questions & waiting_for_ai")
    print(f"🔗 后端大脑: {BACKEND_URL}")
    
    while True:
        try:
            poll_participants(db)
        except Exception as e:
            print(f"⚠️ [Worker] 轮询网络波动: {e}")
        time.sleep(2) # 每 2 秒扫一次，保证极速响应


if __name__ == "__main__":
    main()