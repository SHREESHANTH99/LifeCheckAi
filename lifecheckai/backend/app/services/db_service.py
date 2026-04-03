import time
import json
import requests
from lifecheckai.backend.app.config import SPACETIMEDB_HOST, SPACETIMEDB_DB_NAME

# SpaceTimeDB REST API base
BASE = f"{SPACETIMEDB_HOST}/v1/database/{SPACETIMEDB_DB_NAME}"

CACHE_TTL_SECONDS = 300  # 5 minutes


def _query_rows(sql: str) -> list[dict]:
    """
    Execute SQL against SpaceTimeDB and return rows as dicts.
    """
    try:
        res = requests.post(
            f"{BASE}/sql",
            headers={"Content-Type": "text/plain"},
            data=sql,
            timeout=5,
        )
        if res.status_code != 200:
            return []

        payload = res.json()
        if not isinstance(payload, list) or not payload:
            return []

        frame = payload[0]
        schema = frame.get("schema", {}).get("elements", [])
        columns = [col.get("name", {}).get("some") for col in schema]
        rows = frame.get("rows", [])

        result = []
        for row in rows:
            result.append({k: v for k, v in zip(columns, row)})
        return result

    except Exception:
        return []


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
            f"{BASE}/call/save_city_data",
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
        safe_city = city.lower().replace("'", "''")
        rows = _query_rows(
            f"select id, city, data, timestamp from city_data where city = '{safe_city}'"
        )

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
        rows = _query_rows("select id, city, data, timestamp from city_data")
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