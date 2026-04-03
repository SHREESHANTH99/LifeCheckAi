from fastapi import APIRouter, Query, HTTPException
from app.services.maps_service import get_coordinates
from app.services.weather_service import get_weather
from app.services.air_service import get_air_quality
from app.services.pollen_service import get_pollen
from app.services.db_service import save_city_data, get_city_data, get_all_cities
from app.utils.rules import air_safety, weather_safety, pollen_safety, overall_safety

router = APIRouter(prefix="/api", tags=["Safety"])


# ─────────────────────────────────────────
# MAIN ENDPOINT: CHECK SAFETY FOR CITY
# ─────────────────────────────────────────

@router.get("/check-safety")
def check_safety(city: str = Query(..., description="City name to check safety for")):

    city_key = city.strip().lower()

    # ── Step 1: Check SpaceTimeDB cache ──
    cached = get_city_data(city_key)
    if cached:
        return {
            "source": "realtime_cache",
            "cache_hit": True,
            **cached
        }

    # ── Step 2: Geocode city ──
    coords = get_coordinates(city)
    if not coords:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    lat = coords["lat"]
    lon = coords["lon"]

    # ── Step 3: Fetch all data in parallel (basic version) ──
    weather_data = get_weather(lat, lon)
    air_data = get_air_quality(lat, lon)
    pollen_data = get_pollen(lat, lon)

    # ── Step 4: Validate critical data ──
    if not weather_data:
        raise HTTPException(status_code=502, detail="Weather data unavailable")

    if not air_data:
        raise HTTPException(status_code=502, detail="Air quality data unavailable")

    # ── Step 5: Apply rule engine ──
    air_result = air_safety(air_data.get("aqi"))
    weather_result = weather_safety(
        weather_data.get("temp"),
        weather_data.get("condition", "")
    )
    pollen_result = pollen_safety(pollen_data)
    verdict = overall_safety(air_result, weather_result, pollen_result)

    # ── Step 6: Build response ──
    result = {
        "city": city,
        "formatted_address": coords.get("formatted_address"),
        "coordinates": {
            "lat": lat,
            "lon": lon
        },
        "overall": verdict,
        "air_quality": {
            "aqi": air_data.get("aqi"),
            "category": air_data.get("category"),
            "dominant_pollutant": air_data.get("dominant_pollutant"),
            "pollutants": air_data.get("pollutants", {}),
            **air_result
        },
        "weather": {
            "temp_celsius": weather_data.get("temp"),
            "feels_like": weather_data.get("feels_like"),
            "humidity_percent": weather_data.get("humidity"),
            "condition": weather_data.get("condition"),
            "uv_index": weather_data.get("uv_index"),
            "wind_speed": weather_data.get("wind_speed"),
            **weather_result
        },
        "pollen": {
            "types": pollen_data,
            **pollen_result
        }
    }

    # ── Step 7: Store in SpaceTimeDB ──
    save_city_data(city_key, result)

    return {
        "source": "live",
        "cache_hit": False,
        **result
    }


# ─────────────────────────────────────────
# LIVE CITIES DASHBOARD
# ─────────────────────────────────────────

@router.get("/cities/live")
def live_cities():
    """
    Returns all currently cached city safety states.
    Powers multi-city real-time dashboard.
    """
    cities = get_all_cities()
    return {
        "count": len(cities),
        "cities": cities
    }