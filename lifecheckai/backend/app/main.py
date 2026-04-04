import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from lifecheckai.backend.app.config import ENABLE_SCHEDULER
from lifecheckai.backend.app.routes import alerts
from lifecheckai.backend.app.routes import chat
from lifecheckai.backend.app.routes import history
from lifecheckai.backend.app.routes import realtime
from lifecheckai.backend.app.routes import safety, test
from lifecheckai.backend.app.routes import water
from lifecheckai.backend.app.services.scheduler import scheduler

app = FastAPI(
    title="LifeCheck AI API",
    description="Real-time safety and environment assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(safety.router)
app.include_router(alerts.router)
app.include_router(history.router)
app.include_router(chat.router)
app.include_router(realtime.router)
app.include_router(test.router)
app.include_router(water.router)


@app.get("/")
def home():
    return {"message": "LifeCheck AI Backend Running 🚀"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "scheduler": "enabled" if ENABLE_SCHEDULER else "disabled",
    }


@app.on_event("startup")
async def start_scheduler():
    if ENABLE_SCHEDULER:
        asyncio.create_task(scheduler())
