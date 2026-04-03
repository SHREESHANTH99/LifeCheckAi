import requests
from lifecheckai.backend.app.config import GOOGLE_API_KEY

AIR_QUALITY_URL = "https://airquality.googleapis.com/v1/currentConditions:lookup"

def get_air_quality(lat: float, lon: float) -> dict | None:
    """
    Fetches real-time air quality using Google Air Quality API.
    Returns AQI, category, dominant pollutant, and per-pollutant data.
    """
    payload = {
        "location": {
            "latitude": lat,
            "longitude": lon
        },
        "universalAqi": True
    }

    headers = {
        "Content-Type": "application/json"
    }

    params = {
        "key": GOOGLE_API_KEY
    }

    try:
        res = requests.post(
            AIR_QUALITY_URL,
            json=payload,
            headers=headers,
            params=params,
            timeout=6
        )
        res.raise_for_status()
        data = res.json()

        # Parse universal AQI index
        indexes = data.get("indexes", [])
        universal = next(
            (i for i in indexes if i.get("code") == "uaqi"), {}
        )

        aqi = universal.get("aqi")
        category = universal.get("category", "Unknown")
        dominant = universal.get("dominantPollutant", "Unknown")

        # Parse individual pollutants when provided by API
        pollutants_raw = data.get("pollutants", [])
        pollutants = {}

        for p in pollutants_raw:
            code = p.get("code", "")
            concentration = p.get("concentration", {})
            pollutants[code] = {
                "value": concentration.get("value"),
                "units": concentration.get("units")
            }

        return {
            "aqi": aqi,
            "category": category,
            "dominant_pollutant": dominant,
            "pollutants": pollutants
        }

    except requests.exceptions.Timeout:
        print("[AIR QUALITY ERROR] Timeout")
        return None

    except Exception as e:
        print(f"[AIR QUALITY ERROR] {e}")
        return None