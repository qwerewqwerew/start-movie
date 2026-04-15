from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import requests, httpx, asyncio, os
from dotenv import load_dotenv

# .env 파일에서 환경변수 로드 (HF_TOKEN, RENDER_EXTERNAL_URL 등)
# .env 파일에서 환경변수 로드 (HF_TOKEN, RENDER_EXTERNAL_URL 등)
load_dotenv()

# Render 환경변수에서 백엔드 자신의 URL 읽기. 로컬 실행 시 localhost로 대체
SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")


async def ping_self():
    """
    슬립 방지용 자가 핑 함수.
    Render 무료 플랜은 15분 비활성 시 슬립되므로
    14분 간격으로 /health를 호출해 활성 상태를 유지한다.
    """
    while True:
        await asyncio.sleep(60 * 14)
        try:
            async with httpx.AsyncClient() as client:
                await client.get(f"{SELF_URL}/health", timeout=10)
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 ping_self 백그라운드 태스크 등록"""
    asyncio.create_task(ping_self())
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://start-movie-1.onrender.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Msg(BaseModel):
    text: str


HF_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "Qwen/Qwen2.5-7B-Instruct"


def ask_ai(q: str) -> str:
    token = os.getenv("HF_TOKEN")
    headers = {"Authorization": f"Bearer {token}"}
    print("API Response:", data)
    payload = {
        "model": HF_MODEL,
        "messages": [{"role": "user", "content": q}],
        "max_tokens": 300,
    }
    res = requests.post(HF_URL, headers=headers, json=payload)
    data = res.json()
    if "choices" in data:
        return data["choices"][0]["message"]["content"]
    elif "error" in data:
        return f"API 오류: {data['error']}"
    elif isinstance(data, list) and len(data) > 0:
        # HF Inference API 기본 형식
        return data[0].get("generated_text", "응답 없음")
    else:
        return f"알 수 없는 응답 형식: {str(data)}"


@app.get("/health")
def health():
    """슬립 방지 핑 타깃 및 Render 헬스체크용"""
    return {"status": "ok"}


@app.post("/chat")
def chat(msg: Msg):
    reply = ask_ai(msg.text)
    return {"reply": reply}
