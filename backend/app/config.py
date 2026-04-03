import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SPACETIMEDB_HOST = os.getenv("SPACETIMEDB_HOST")
SPACETIMEDB_DB_NAME = os.getenv("SPACETIMEDB_DB_NAME", "lifecheck")
