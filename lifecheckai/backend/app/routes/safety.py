from fastapi import APIRouter, HTTPException, Query

from lifecheckai.backend.app.services.air_service import get_air_quality
from lifecheckai.backend.app.services.db_service import (
    get_all_cities,
    get_city_data,
    save_city_data,
)
from lifecheckai.backend.app.services.maps_service import get_coordinates
from lifecheckai.backend.app.services.pollen_service import get_pollen
from lifecheckai.backend.app.services.weather_service import get_weather
from lifecheckai.backend.app.utils.rules import (
    air_safety,
    overall_safety,
    pollen_safety,
    weather_safety,
)

router = APIRouter(prefix="/api", tags=["Safety"])


def get_city_safety_snapshot(city: str, allow_partial: bool = False) -> dict:
    city_key = city.strip().lower()

    cached = get_city_data(city_key)
    if cached:
        return {
            "source": "realtime_cache",
            "cache_hit": True,
            **cached,
        }

    coords = get_coordinates(city)
    if not coords:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    lat = coords["lat"]
    lon = coords["lon"]

    weather_data = get_weather(lat, lon)
    air_data = get_air_quality(lat, lon)
    pollen_data = get_pollen(lat, lon)

    if not allow_partial:
        if not weather_data:
            raise HTTPException(status_code=502, detail="Weather data unavailable")

        if not air_data:
            raise HTTPException(status_code=502, detail="Air quality data unavailable")

    air_result = air_safety(air_data.get("aqi") if air_data else None)
    weather_result = weather_safety(
        weather_data.get("temp") if weather_data else None,
        weather_data.get("condition", "") if weather_data else "",
    )
    pollen_result = pollen_safety(pollen_data)
    verdict = overall_safety(air_result, weather_result, pollen_result)

    result = {
        "city": city,
        "formatted_address": coords.get("formatted_address"),
        "coordinates": {
            "lat": lat,
            "lon": lon,
        },
        "overall": verdict,
        "air_quality": {
            "aqi": air_data.get("aqi") if air_data else None,
            "category": air_data.get("category") if air_data else "Unknown",
            "dominant_pollutant": (
                air_data.get("dominant_pollutant") if air_data else None
            ),
            "pollutants": air_data.get("pollutants", {}) if air_data else {},
            **air_result,
        },
        "weather": {
            "temp_celsius": weather_data.get("temp") if weather_data else None,
            "feels_like": weather_data.get("feels_like") if weather_data else None,
            "humidity_percent": weather_data.get("humidity") if weather_data else None,
            "condition": weather_data.get("condition") if weather_data else "Unknown",
            "uv_index": weather_data.get("uv_index") if weather_data else None,
            "wind_speed": weather_data.get("wind_speed") if weather_data else None,
            **weather_result,
        },
        "pollen": {
            "types": pollen_data,
            **pollen_result,
        },
    }

    if air_data and weather_data:
        save_city_data(city_key, result)

    return {
        "source": "live",
        "cache_hit": False,
        **result,
    }


@router.get("/check-safety")
def check_safety(city: str = Query(..., description="City name to check safety for")):
    return get_city_safety_snapshot(city)


@router.get("/cities/live")
def live_cities():
    """
    Returns all currently cached city safety states.
    Powers multi-city real-time dashboard.
    """
    cities = get_all_cities()
    return {
        "count": len(cities),
        "cities": cities,
    }
