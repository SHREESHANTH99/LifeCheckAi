import requests
from app.config import GOOGLE_API_KEY

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def get_coordinates(city: str) -> dict | None:
    """
    Converts city name → { lat, lon, formatted_address }
    Uses Google Geocoding API
    """
    params = {
        "address": city,
        "key": GOOGLE_API_KEY
    }

    try:
        res = requests.get(GEOCODING_URL, params=params, timeout=6)
        res.raise_for_status()
        data = res.json()

        if data.get("status") != "OK":
            print(f"[GEOCODING ERROR] Status: {data.get('status')}")
            return None

        result = data["results"][0]
        location = result["geometry"]["location"]

        return {
            "lat": location["lat"],
            "lon": location["lng"],
            "formatted_address": result.get("formatted_address", city)
        }

    except requests.exceptions.Timeout:
        print("[GEOCODING ERROR] Request timed out")
        return None

    except Exception as e:
        print(f"[GEOCODING ERROR] {e}")
        return None