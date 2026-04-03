import time
import json
import requests
from app.config import SPACETIMEDB_HOST, SPACETIMEDB_DB_NAME

# SpaceTimeDB REST API base
BASE = f"{SPACETIMEDB_HOST}/database/{SPACETIMEDB_DB_NAME}"

CACHE_TTL_SECONDS = 300  # 5 minutes


# ─────────────────────────────────────────
# SAVE CITY SAFETY DATA
# ─────────────────────────────────────────

def save_city_data(city: str, data: dict) -> bool:
    """
    Saves city safety snapshot to SpaceTimeDB.
    """
    payload = {
        "city": city.lower(),
        "data": json.dumps(data),
        "timestamp": int(time.time())
    }

    try:
        res = requests.post(
            f"{BASE}/reducer/save_city_data",
            json=payload,
            timeout=5
        )
        return res.status_code == 200

    except Exception as e:
        print(f"[SPACETIMEDB SAVE ERROR] {e}")
        return False


# ─────────────────────────────────────────
# GET CACHED CITY DATA
# ─────────────────────────────────────────

def get_city_data(city: str) -> dict | None:
    """
    Retrieves latest cached city safety data.
    Returns None if cache is expired (>5 mins).
    """
    try:
        res = requests.get(
            f"{BASE}/table/city_data",
            params={"city": city.lower()},
            timeout=5
        )

        if res.status_code != 200:
            return None

        rows = res.json()

        if not rows:
            return None

        # Use most recent row
        latest = sorted(rows, key=lambda r: r["timestamp"], reverse=True)[0]

        # Check TTL
        age = int(time.time()) - latest["timestamp"]
        if age > CACHE_TTL_SECONDS:
            print(f"[CACHE EXPIRED] {city} — {age}s old")
            return None

        return json.loads(latest["data"])

    except Exception as e:
        print(f"[SPACETIMEDB GET ERROR] {e}")
        return None


# ─────────────────────────────────────────
# GET ALL CACHED CITIES (for dashboard)
# ─────────────────────────────────────────

def get_all_cities() -> list:
    """
    Returns all cached city safety states.
    Used for live multi-city dashboard.
    """
    try:
        res = requests.get(
            f"{BASE}/table/city_data",
            timeout=5
        )

        if res.status_code != 200:
            return []

        rows = res.json()
        cutoff = int(time.time()) - CACHE_TTL_SECONDS

        # Only return fresh data
        fresh = [r for r in rows if r["timestamp"] >= cutoff]

        return [
            {
                "city": r["city"],
                "data": json.loads(r["data"]),
                "age_seconds": int(time.time()) - r["timestamp"]
            }
            for r in fresh
        ]

    except Exception as e:
        print(f"[SPACETIMEDB LIST ERROR] {e}")
        return []