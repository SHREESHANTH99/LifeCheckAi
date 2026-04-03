import requests
from app.config import GOOGLE_API_KEY

WEATHER_URL = "https://weather.googleapis.com/v1/currentConditions:lookup"

def get_weather(lat: float, lon: float) -> dict | None:
    """
    Fetches current weather conditions using Google Weather API.
    Returns: temp, feels_like, humidity, condition, wind_speed, uv_index
    """
    params = {
        "location.latitude": lat,
        "location.longitude": lon,
        "key": GOOGLE_API_KEY
    }

    try:
        res = requests.get(WEATHER_URL, params=params, timeout=6)
        res.raise_for_status()
        data = res.json()

        # Extract safely with fallbacks
        temp_data = data.get("temperature", {})
        feels_like_data = data.get("feelsLikeTemperature", {})
        wind_data = data.get("wind", {})
        condition = data.get("weatherCondition", {})

        return {
            "temp": temp_data.get("degrees"),
            "feels_like": feels_like_data.get("degrees"),
            "humidity": data.get("relativeHumidity"),
            "condition": condition.get("description", {}).get("text", "Unknown"),
            "condition_type": condition.get("type", "UNKNOWN"),
            "wind_speed": wind_data.get("speed", {}).get("value"),
            "uv_index": data.get("uvIndex"),
            "is_daytime": data.get("isDaytime", True)
        }

    except requests.exceptions.Timeout:
        print("[WEATHER ERROR] Timeout")
        return None

    except Exception as e:
        print(f"[WEATHER ERROR] {e}")
        return None