from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from lifecheckai.backend.app.config import SCHEDULER_CITIES
from lifecheckai.backend.app.models.safety_model import (
    Air,
    AlertItem,
    Overall,
    SafetyResponse,
    Water,
    Weather,
)
from lifecheckai.backend.app.services.air_service import get_air_quality
from lifecheckai.backend.app.services.db_service import (
    get_all_cities,
    get_city_data,
    save_city_data,
)
from lifecheckai.backend.app.services.maps_service import get_coordinates
from lifecheckai.backend.app.services.maps_service import get_place_from_coordinates
from lifecheckai.backend.app.services.pollen_service import get_pollen
from lifecheckai.backend.app.services.runtime_state import (
    record_alerts,
    record_aqi,
    record_snapshot,
)
from lifecheckai.backend.app.services.water_service import analyze_trend, get_state_data
from lifecheckai.backend.app.services.weather_service import get_weather
from lifecheckai.backend.app.utils.alerts import generate_alerts
from lifecheckai.backend.app.utils.predict import predict_aqi
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
    if cached and _is_v2_snapshot(cached):
        normalized_cached = _normalize_snapshot_payload(cached, city)
        if normalized_cached != cached:
            save_city_data(city_key, normalized_cached)
        return {
            "source": "realtime_cache",
            "cache_hit": True,
            **normalized_cached,
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

    result = _build_snapshot(
        city=city,
        coords=coords,
        weather_data=weather_data,
        air_data=air_data,
        pollen_data=pollen_data,
    )

    if air_data and weather_data:
        save_city_data(city_key, result)

    return {
        "source": "live",
        "cache_hit": False,
        **result,
    }


@router.get("/check-safety", response_model=SafetyResponse)
def check_safety(city: str = Query(..., description="City name to check safety for")):
    payload = get_city_safety_snapshot(city)
    return SafetyResponse(**payload)


@router.get("/check-safety-by-coordinates", response_model=SafetyResponse)
def check_safety_by_coordinates(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    resolved = get_place_from_coordinates(lat, lon) or {}
    city = str(resolved.get("city") or "Current Location")

    weather_data = get_weather(lat, lon)
    air_data = get_air_quality(lat, lon)
    pollen_data = get_pollen(lat, lon)

    if not weather_data:
        raise HTTPException(status_code=502, detail="Weather data unavailable")
    if not air_data:
        raise HTTPException(status_code=502, detail="Air quality data unavailable")

    coords = {
        "lat": lat,
        "lon": lon,
        "formatted_address": resolved.get("formatted_address") or city,
        "geocoding": resolved.get("geocoding")
        or {
            "provider": "coordinate_input",
            "match": "precise",
            "confidence": 1.0,
            "source": "browser_geolocation",
        },
    }

    payload = _build_snapshot(
        city=city,
        coords=coords,
        weather_data=weather_data,
        air_data=air_data,
        pollen_data=pollen_data,
    )

    return SafetyResponse(**payload)


@router.get("/cities/live")
def live_cities():
    """
    Returns all currently cached city safety states.
    Powers multi-city real-time dashboard.
    """
    cities = _load_live_cities()
    return {
        "count": len(cities),
        "cities": cities,
    }


def _is_v2_snapshot(snapshot: dict) -> bool:
    return "air" in snapshot and "weather" in snapshot and "alerts" in snapshot


def _load_live_cities() -> list[dict]:
    cities = get_all_cities()
    existing_keys = {str(row.get("city", "")).strip().lower() for row in cities}
    missing_cities = [
        city for city in SCHEDULER_CITIES if city.strip().lower() not in existing_keys
    ]

    if missing_cities:
        for city in missing_cities:
            try:
                get_city_safety_snapshot(city, True)
            except Exception as exc:
                print(f"[LIVE CITIES WARMUP ERROR] {city}: {exc}")
        cities = get_all_cities()

    normalized: list[dict] = []
    for row in cities:
        snapshot = row.get("data")
        if not isinstance(snapshot, dict) or not _is_v2_snapshot(snapshot):
            continue

        city_name = str(row.get("city") or snapshot.get("city") or "").strip()
        normalized_snapshot = _normalize_snapshot_payload(snapshot, city_name)
        if normalized_snapshot != snapshot and city_name:
            save_city_data(city_name.lower(), normalized_snapshot)

        normalized.append(
            {
                "city": normalized_snapshot.get("city") or city_name,
                "data": normalized_snapshot,
                "age_seconds": row.get("age_seconds", 0),
            }
        )

    return sorted(
        normalized,
        key=lambda row: str(row.get("city", "")).lower(),
    )


def _build_snapshot(
    *,
    city: str,
    coords: dict,
    weather_data: dict | None,
    air_data: dict | None,
    pollen_data: dict | None,
) -> dict:
    air_result = air_safety(air_data.get("aqi") if air_data else None)
    weather_result = weather_safety(
        weather_data.get("temp") if weather_data else None,
        weather_data.get("condition", "") if weather_data else "",
    )
    pollen_result = pollen_safety(pollen_data)
    verdict = overall_safety(air_result, weather_result, pollen_result)

    water_summary = analyze_trend(get_state_data(city, coords.get("formatted_address")))

    air = Air(
        aqi=air_data.get("aqi") if air_data else None,
        status=(air_result.get("level") or air_data.get("category", "Unknown")) if air_data else "Unknown",
        advice=air_result.get("advice"),
        category=air_data.get("category") if air_data else None,
        dominant_pollutant=air_data.get("dominant_pollutant") if air_data else None,
    )
    weather = Weather(
        temp=weather_data.get("temp") if weather_data else None,
        condition=weather_data.get("condition") if weather_data else "Unknown",
        status=weather_result.get("level") or "Unknown",
        advice=weather_result.get("advice"),
        feels_like=weather_data.get("feels_like") if weather_data else None,
        humidity=weather_data.get("humidity") if weather_data else None,
    )
    water = Water(**water_summary) if water_summary else None

    history = record_aqi(city, air.aqi)
    prediction = predict_aqi(history)

    alert_seed = {
        "city": city,
        "air": air.model_dump(),
        "weather": weather.model_dump(),
        "water": water.model_dump() if water else None,
    }
    alerts = generate_alerts(alert_seed)
    record_alerts(city, alerts)

    timestamp = datetime.now(timezone.utc).isoformat()

    response = SafetyResponse(
        city=city,
        formatted_address=coords.get("formatted_address"),
        coordinates={
            "lat": coords["lat"],
            "lon": coords["lon"],
        },
        geocoding=coords.get("geocoding"),
        overall=Overall(**verdict),
        air=air,
        weather=weather,
        water=water,
        alerts=[
            AlertItem(
                city=city,
                timestamp=timestamp,
                type=alert["type"],
                level=alert["level"],
                message=alert["message"],
            )
            for alert in alerts
        ],
        prediction=prediction,
        pollen={
            "types": pollen_data,
            **pollen_result,
        },
    )
    payload = response.model_dump()
    payload["composite_score"] = _compute_composite_score(payload)
    record_snapshot(city, payload)
    return payload


def _compute_composite_score(snapshot: dict) -> int:
    air = snapshot.get("air", {})
    weather = snapshot.get("weather", {})
    water = snapshot.get("water", {})

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


def _normalize_snapshot_payload(snapshot: dict, requested_city: str | None = None) -> dict:
    normalized = dict(snapshot)

    city_name = normalized.get("city")
    if not isinstance(city_name, str) or not city_name.strip():
        if requested_city:
            normalized["city"] = requested_city
    elif city_name.strip().islower():
        formatted = normalized.get("formatted_address")
        if isinstance(formatted, str) and formatted.strip():
            normalized["city"] = formatted.split(",")[0].strip()
        else:
            normalized["city"] = city_name.title()

    if normalized.get("composite_score") is None:
        normalized["composite_score"] = _compute_composite_score(normalized)

    return normalized
