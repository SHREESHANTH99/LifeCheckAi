import os

from dotenv import load_dotenv

load_dotenv()

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
