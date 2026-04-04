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
        if res.status_code != 200:
            print(f"[SPACETIMEDB SAVE FAILED] {city}: {res.status_code} {res.text[:200]}")
            return False
        return True

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

        snapshot = _parse_snapshot(latest.get("data"))
        if not snapshot:
            return None

        normalized = _normalize_snapshot(snapshot, city.lower())
        if normalized != snapshot:
            save_city_data(city.lower(), normalized)
        return normalized

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
        now = int(time.time())
        latest_by_city: dict[str, dict] = {}

        for row in rows:
            timestamp = int(row.get("timestamp", 0) or 0)
            if timestamp < cutoff:
                continue

            city_key = str(row.get("city", "")).strip().lower()
            if not city_key:
                continue

            snapshot = _parse_snapshot(row.get("data"))
            if not snapshot:
                continue

            normalized_snapshot = _normalize_snapshot(snapshot, city_key)
            if normalized_snapshot != snapshot:
                save_city_data(city_key, normalized_snapshot)
            snapshot = normalized_snapshot

            current = latest_by_city.get(city_key)
            if current and current["timestamp"] >= timestamp:
                continue

            latest_by_city[city_key] = {
                "city": _display_city_name(city_key, snapshot),
                "data": snapshot,
                "age_seconds": max(0, now - timestamp),
                "timestamp": timestamp,
            }

        return sorted(
            [
                {
                    "city": row["city"],
                    "data": row["data"],
                    "age_seconds": row["age_seconds"],
                }
                for row in latest_by_city.values()
            ],
            key=lambda row: str(row["city"]).lower(),
        )

    except Exception as e:
        print(f"[SPACETIMEDB LIST ERROR] {e}")
        return []


def _parse_snapshot(raw: str | None) -> dict | None:
    if not raw:
        return None

    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _display_city_name(city_key: str, snapshot: dict) -> str:
    city_name = snapshot.get("city")
    if isinstance(city_name, str) and city_name.strip():
        if city_name.strip().islower():
            formatted = snapshot.get("formatted_address")
            if isinstance(formatted, str) and formatted.strip():
                return formatted.split(",")[0].strip()
        return city_name

    formatted = snapshot.get("formatted_address")
    if isinstance(formatted, str) and formatted.strip():
        return formatted.split(",")[0].strip()

    return city_key.title()


def _normalize_snapshot(snapshot: dict, city_key: str) -> dict:
    normalized = dict(snapshot)

    if normalized.get("composite_score") is None:
        normalized["composite_score"] = _compute_composite_score(normalized)

    city_name = _display_city_name(city_key, normalized)
    if normalized.get("city") != city_name:
        normalized["city"] = city_name

    return normalized


def _compute_composite_score(snapshot: dict) -> int:
    air = snapshot.get("air", {}) or {}
    weather = snapshot.get("weather", {}) or {}
    water = snapshot.get("water", {}) or {}

    air_score = 100
    aqi = air.get("aqi")
    if aqi is not None:
        air_score = max(0, min(100, 100 - int(aqi * 0.4)))

    weather_score = 100
    temp = weather.get("temp")
    if temp is not None:
        if temp >= 45:
            weather_score = 20
        elif temp >= 40:
            weather_score = 50
        elif temp <= 5:
            weather_score = 55

    water_score = 100
    latest_tds = water.get("latest_tds") or water.get("avg_tds")
    if latest_tds is not None:
        if latest_tds > 3000:
            water_score = 15
        elif latest_tds > 2000:
            water_score = 35
        elif latest_tds > 500:
            water_score = 70

    return round((air_score * 0.6) + (weather_score * 0.2) + (water_score * 0.2))
