from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import safety, realtime, test

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
app.include_router(realtime.router)
app.include_router(test.router)


@app.get("/")
def home():
    return {"message": "LifeCheck AI Backend Running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


app.include_router(test.router)
