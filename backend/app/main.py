from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import test

app = FastAPI(title="LifeCheck AI API")

# CORS middleware allows frontend apps on other origins to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "LifeCheck AI Backend Running 🚀"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(test.router)
