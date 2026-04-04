import requests
from lifecheckai.backend.app.config import GOOGLE_API_KEY

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"

MOCK_COORDS = {
    "delhi": {"lat": 28.6139, "lon": 77.2090, "formatted_address": "New Delhi, Delhi, India"},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "formatted_address": "Mumbai, Maharashtra, India"},
    "bangalore": {"lat": 12.9716, "lon": 77.5946, "formatted_address": "Bengaluru, Karnataka, India"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "formatted_address": "Chennai, Tamil Nadu, India"},
    "kolkata": {"lat": 22.5726, "lon": 88.3639, "formatted_address": "Kolkata, West Bengal, India"},
    "pune": {"lat": 18.5204, "lon": 73.8567, "formatted_address": "Pune, Maharashtra, India"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "formatted_address": "Hyderabad, Telangana, India"},
}

def get_coordinates(city: str) -> dict | None:
    """
    Converts city name → { lat, lon, formatted_address }
    Uses Google Geocoding API with fallback to mock data
    """
    if not GOOGLE_API_KEY or GOOGLE_API_KEY == "dummy":
        return MOCK_COORDS.get(city.lower()) or {"lat": 20.0, "lon": 78.0, "formatted_address": city}

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
            return MOCK_COORDS.get(city.lower())

        result = data["results"][0]
        location = result["geometry"]["location"]

        return {
            "lat": location["lat"],
            "lon": location["lng"],
            "formatted_address": result.get("formatted_address", city)
        }

    except Exception as e:
        print(f"[GEOCODING ERROR] {e}")
        return MOCK_COORDS.get(city.lower())