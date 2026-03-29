from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import requests, httpx, asyncio, os
from dotenv import load_dotenv

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
HF_MODEL = "Qwen/Qwen2.5-72B-Instruct"


def ask_ai(q: str) -> str:
    token = os.getenv("HF_TOKEN")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "model": HF_MODEL,
        "messages": [{"role": "user", "content": q}],
        "max_tokens": 300,
    }
    res = requests.post(HF_URL, headers=headers, json=payload)
    data = res.json()
    return data["choices"][0]["message"]["content"]


@app.get("/health")
def health():
    """슬립 방지 핑 타깃 및 Render 헬스체크용"""
    return {"status": "ok"}


@app.post("/chat")
def chat(msg: Msg):
    reply = ask_ai(msg.text)
    return {"reply": reply}
