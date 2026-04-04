from __future__ import annotations

import json

from fastapi import APIRouter, Query

from lifecheckai.backend.app.models.chat_model import (
    ChatLocation,
    ChatModelMeta,
    ChatResponse,
    StructuredAnswer,
)
from lifecheckai.backend.app.routes.safety import get_city_safety_snapshot
from lifecheckai.backend.app.services.gemini_service import generate_response
from lifecheckai.backend.app.services.water_service import resolve_state_name
from lifecheckai.backend.app.utils.confidence import compute_confidence
from lifecheckai.backend.app.utils.intent import detect_intent
from lifecheckai.backend.app.utils.parser import extract_location, match_location
from lifecheckai.backend.app.utils.prompt_builder import (
    build_fallback_sections,
    build_prompt,
    normalize_sections,
    render_sections,
)
from lifecheckai.backend.app.utils.safety_guard import check_critical

router = APIRouter(tags=["Chat"])


@router.get("/ask", response_model=ChatResponse)
@router.get("/api/ask", response_model=ChatResponse)
def ask(
    query: str = Query(..., description="Natural-language environment or safety question"),
    user_profile: str | None = Query(
        None,
        description="Optional JSON encoded user profile for personalization",
    ),
):
    profile = _parse_user_profile(user_profile)
    requested_location = _resolve_request_location(query, profile)
    intent = detect_intent(query)

    safety_snapshot = get_city_safety_snapshot(requested_location, allow_partial=True)
    normalized = _normalize_snapshot(safety_snapshot, requested_location)

    critical = check_critical(normalized)
    if critical:
        sections = {
            "summary": critical["message"],
            "air": _critical_air_text(normalized),
            "weather": _critical_weather_text(normalized),
            "water": _critical_water_text(normalized),
            "action": _profile_action(critical["recommendation"], profile),
        }
        return ChatResponse(
            query=query,
            intent=intent,
            location=ChatLocation(**_location_payload(normalized)),
            source=_source_payload(normalized),
            confidence=100,
            safety_override=critical,
            structured_answer=StructuredAnswer(**sections),
            answer=render_sections(sections),
            model=ChatModelMeta(
                provider="safety_guard",
                used_ai=False,
                fallback_used=False,
            ),
            user_profile=profile,
        )

    prompt = build_prompt(normalized, query, intent, profile)
    ai_sections = normalize_sections(generate_response(prompt))
    used_ai = ai_sections is not None
    sections = ai_sections or build_fallback_sections(normalized, query, intent, profile)

    return ChatResponse(
        query=query,
        intent=intent,
        location=ChatLocation(**_location_payload(normalized)),
        source=_source_payload(normalized),
        confidence=compute_confidence(normalized),
        safety_override=None,
        structured_answer=StructuredAnswer(**sections),
        answer=render_sections(sections),
        model=ChatModelMeta(
            provider="gemini" if used_ai else "fallback",
            used_ai=used_ai,
            fallback_used=not used_ai,
        ),
        user_profile=profile,
    )


def _normalize_snapshot(snapshot: dict, requested_location: str) -> dict:
    city = snapshot.get("city") or requested_location
    formatted_address = snapshot.get("formatted_address")

    return {
        "requested_location": requested_location,
        "city": city,
        "formatted_address": formatted_address,
        "groundwater_state": resolve_state_name(city, formatted_address),
        "source": snapshot.get("source"),
        "cache_hit": snapshot.get("cache_hit", False),
        "overall": snapshot.get("overall") or {},
        "air": snapshot.get("air") or {},
        "weather": snapshot.get("weather") or {},
        "water": snapshot.get("water") or {},
        "alerts": snapshot.get("alerts") or [],
        "prediction": snapshot.get("prediction"),
    }


def _resolve_request_location(query: str, profile: dict | None) -> str:
    explicit = match_location(query)
    if explicit:
        return explicit

    default_city = str(profile.get("default_city", "")).strip() if profile else ""
    return extract_location(query, default=default_city or "Delhi")


def _parse_user_profile(user_profile: str | None) -> dict | None:
    if not user_profile:
        return None

    try:
        parsed = json.loads(user_profile)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    return {"type": user_profile}


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
        "prediction": data.get("prediction"),
        "alerts_count": len(data.get("alerts") or []),
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


def _profile_action(action: str, profile: dict | None) -> str:
    if not profile:
        return action

    profile_type = str(profile.get("type", "")).strip().lower()
    if profile_type == "asthma":
        return f"{action} Avoid outdoor exposure if breathing feels strained."

    return action
