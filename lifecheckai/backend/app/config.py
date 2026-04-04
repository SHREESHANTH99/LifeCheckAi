import os
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or GOOGLE_API_KEY
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
GEOCODING_COUNTRY = os.getenv("GEOCODING_COUNTRY", "IN")
GEOCODING_REGION = os.getenv("GEOCODING_REGION", "in")
SPACETIMEDB_HOST = os.getenv("SPACETIMEDB_HOST")
SPACETIMEDB_DB_NAME = os.getenv("SPACETIMEDB_DB_NAME", "lifecheck")
ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "true").lower() == "true"
SCHEDULER_INTERVAL_SECONDS = int(os.getenv("SCHEDULER_INTERVAL_SECONDS", "300"))
SCHEDULER_CITIES = [
    city.strip()
    for city in os.getenv(
        "SCHEDULER_CITIES",
        "Delhi,Mumbai,Bangalore,Chennai",
    ).split(",")
    if city.strip()
]
