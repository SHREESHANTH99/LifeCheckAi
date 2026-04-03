import requests
from app.config import GOOGLE_API_KEY

POLLEN_URL = "https://pollen.googleapis.com/v1/forecast:lookup"

def get_pollen(lat: float, lon: float) -> dict | None:
    """
    Fetches pollen forecast using Google Pollen API.
    Returns: tree, grass, weed pollen levels
    """
    params = {
        "location.latitude": lat,
        "location.longitude": lon,
        "days": 1,
        "key": GOOGLE_API_KEY
    }

    try:
        res = requests.get(POLLEN_URL, params=params, timeout=6)
        res.raise_for_status()
        data = res.json()

        daily_info = data.get("dailyInfo", [{}])[0]
        pollen_types = daily_info.get("pollenTypeInfo", [])

        result = {}
        for pollen in pollen_types:
            name = pollen.get("displayName", "").lower()
            index = pollen.get("indexInfo", {})
            result[name] = {
                "level": index.get("value"),
                "category": index.get("category", "Unknown")
            }

        return result if result else None

    except Exception as e:
        print(f"[POLLEN ERROR] {e}")
        return None