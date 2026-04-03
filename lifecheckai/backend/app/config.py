import os
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SPACETIMEDB_HOST = os.getenv("SPACETIMEDB_HOST")
SPACETIMEDB_DB_NAME = os.getenv("SPACETIMEDB_DB_NAME", "lifecheck")
