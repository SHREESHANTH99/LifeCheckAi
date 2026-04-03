from __future__ import annotations

from fastapi import APIRouter, Query

from lifecheckai.backend.app.routes.safety import get_city_safety_snapshot
from lifecheckai.backend.app.services.gemini_service import generate_response
from lifecheckai.backend.app.services.water_service import (
    analyze_trend,
    get_state_data,
    resolve_state_name,
)
from lifecheckai.backend.app.utils.confidence import compute_confidence
from lifecheckai.backend.app.utils.intent import detect_intent
from lifecheckai.backend.app.utils.parser import extract_location
from lifecheckai.backend.app.utils.prompt_builder import (
    build_fallback_sections,
    build_prompt,
    normalize_sections,
    render_sections,
)
from lifecheckai.backend.app.utils.safety_guard import check_critical

router = APIRouter(tags=["Chat"])


@router.get("/ask")
@router.get("/api/ask")
def ask(query: str = Query(..., description="Natural-language environment or safety question")):
    requested_location = extract_location(query)
    intent = detect_intent(query)

    safety_snapshot = get_city_safety_snapshot(requested_location, allow_partial=True)
    normalized = _normalize_snapshot(safety_snapshot, requested_location)

    groundwater_state = resolve_state_name(
        requested_location,
        normalized.get("formatted_address"),
    )
    water_records = get_state_data(requested_location, normalized.get("formatted_address"))
    water = analyze_trend(water_records)

    combined = {
        **normalized,
        "groundwater_state": groundwater_state,
        "water": water,
    }

    critical = check_critical(combined)
    if critical:
        sections = {
            "summary": critical["message"],
            "air": _critical_air_text(combined),
            "weather": _critical_weather_text(combined),
            "water": _critical_water_text(combined),
            "recommendation": critical["recommendation"],
        }
        return {
            "query": query,
            "intent": intent,
            "location": _location_payload(combined),
            "source": _source_payload(combined),
            "confidence": 100,
            "safety_override": critical,
            "structured_answer": sections,
            "answer": render_sections(sections),
            "model": {
                "provider": "safety_guard",
                "used_ai": False,
                "fallback_used": False,
            },
        }

    prompt = build_prompt(combined, query, intent)
    ai_sections = normalize_sections(generate_response(prompt))
    used_ai = ai_sections is not None
    sections = ai_sections or build_fallback_sections(combined, query, intent)

    return {
        "query": query,
        "intent": intent,
        "location": _location_payload(combined),
        "source": _source_payload(combined),
        "confidence": compute_confidence(combined),
        "safety_override": None,
        "structured_answer": sections,
        "answer": render_sections(sections),
        "model": {
            "provider": "gemini" if used_ai else "fallback",
            "used_ai": used_ai,
            "fallback_used": not used_ai,
        },
    }


def _normalize_snapshot(snapshot: dict, requested_location: str) -> dict:
    air_quality = snapshot.get("air_quality") or {}
    weather = snapshot.get("weather") or {}

    return {
        "requested_location": requested_location,
        "city": snapshot.get("city") or requested_location,
        "formatted_address": snapshot.get("formatted_address"),
        "source": snapshot.get("source"),
        "cache_hit": snapshot.get("cache_hit", False),
        "overall": snapshot.get("overall"),
        "air": {
            "aqi": air_quality.get("aqi"),
            "status": air_quality.get("level") or air_quality.get("category") or "Unknown",
            "category": air_quality.get("category"),
            "dominant_pollutant": air_quality.get("dominant_pollutant"),
            "advice": air_quality.get("advice"),
        },
        "weather": {
            "temp": weather.get("temp_celsius"),
            "status": weather.get("level") or weather.get("condition") or "Unknown",
            "condition": weather.get("condition"),
            "feels_like": weather.get("feels_like"),
            "humidity": weather.get("humidity_percent"),
            "advice": weather.get("advice"),
        },
    }


def _location_payload(data: dict) -> dict:
    return {
        "requested": data.get("requested_location"),
        "resolved_city": data.get("city"),
        "groundwater_state": data.get("groundwater_state"),
        "formatted_address": data.get("formatted_address"),
    }


def _source_payload(data: dict) -> dict:
    return {
        "realtime_source": data.get("source"),
        "cache_hit": data.get("cache_hit", False),
    }


def _critical_air_text(data: dict) -> str:
    air = data.get("air") or {}
    if air.get("aqi") is None:
        return "Air data is missing."
    return f"AQI is {air['aqi']} with status {air.get('status', 'Unknown')}."


def _critical_weather_text(data: dict) -> str:
    weather = data.get("weather") or {}
    if weather.get("temp") is None:
        return "Weather data is missing."
    condition = weather.get("condition") or "current conditions"
    return f"Temperature is {weather['temp']} C with {condition.lower()}."


def _critical_water_text(data: dict) -> str:
    water = data.get("water") or {}
    if not water:
        return "Groundwater history is unavailable for this location."
    return water.get("advisory") or "Groundwater needs caution."
