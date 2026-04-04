from __future__ import annotations

import json
import asyncio

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from lifecheckai.backend.app.models.chat_model import (
    ChatLocation,
    ChatModelMeta,
    ChatResponse,
    StructuredAnswer,
)
from lifecheckai.backend.app.routes.safety import get_city_safety_snapshot
from lifecheckai.backend.app.services.gemini_service import (
    generate_response,
    get_last_gemini_error,
    get_last_llm_provider,
)
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
    blocked_reason = _blocked_reason(query)

    if blocked_reason:
        safe_fallback = (
            "I cannot assist with that request. I can help with environmental safety guidance, "
            "risk interpretation, and official-health-aligned precautions for your city."
        )
        return ChatResponse(
            query=query,
            intent=intent,
            location=ChatLocation(
                requested=requested_location,
                resolved_city=requested_location,
                groundwater_state=resolve_state_name(requested_location, None),
                formatted_address=None,
            ),
            source={"realtime_source": "safety_guard", "cache_hit": False},
            confidence=72,
            safety_override={"blocked": True, "reason": blocked_reason},
            structured_answer=StructuredAnswer(
                summary=safe_fallback,
                air="Ask about AQI, pollutants, or safe outdoor windows.",
                weather="Ask about weather-linked risks and precautions.",
                water="Ask about groundwater trends and advisories for your state.",
                action="I can provide a safe alternative answer if you rephrase the request.",
            ),
            answer=safe_fallback,
            model=ChatModelMeta(provider="safety_guard", used_ai=False, fallback_used=True),
            user_profile=profile,
            action_type="general",
            safety_guard_triggered=True,
            blocked_reason=blocked_reason,
            location_extracted=requested_location,
            intent_detected=intent,
        )

    safety_snapshot = _safe_city_safety_snapshot(requested_location)
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
            action_type=_action_type_from_intent(intent),
            safety_guard_triggered=False,
            blocked_reason=None,
            location_extracted=requested_location,
            intent_detected=intent,
        )

    prompt = build_prompt(normalized, query, intent, profile)
    ai_sections = normalize_sections(generate_response(prompt))
    used_ai = ai_sections is not None
    ai_provider = get_last_llm_provider() if used_ai else None
    sections = ai_sections or build_fallback_sections(normalized, query, intent, profile)
    source_payload = _source_payload(normalized)
    if not used_ai:
        source_payload["ai_error"] = get_last_gemini_error()

    return ChatResponse(
        query=query,
        intent=intent,
        location=ChatLocation(**_location_payload(normalized)),
        source=source_payload,
        confidence=compute_confidence(normalized),
        safety_override=None,
        structured_answer=StructuredAnswer(**sections),
        answer=render_sections(sections),
        model=ChatModelMeta(
            provider=ai_provider or ("fallback" if not used_ai else "gemini"),
            used_ai=used_ai,
            fallback_used=not used_ai,
        ),
        user_profile=profile,
        action_type=_action_type_from_intent(intent),
        safety_guard_triggered=False,
        blocked_reason=None,
        location_extracted=requested_location,
        intent_detected=intent,
    )


@router.get("/ask/stream")
@router.get("/api/ask/stream")
async def ask_stream(
    query: str = Query(..., description="Natural-language environment or safety question"),
    city: str = Query("Delhi", description="City to check"),
    profile: str = Query("general", description="User profile"),
    memory: str = Query("[]", description="Conversation memory as JSON"),
):
    """Stream chat response using Server-Sent Events"""
    
    async def stream_generator():
        try:
            # Check if query is blocked
            blocked_reason = _blocked_reason(query)
            if blocked_reason:
                yield f'data: {json.dumps({"type": "chunk", "text": "I cannot assist with that request. I can help with environmental safety guidance, risk interpretation, and official-health-aligned precautions for your city."})}\n\n'
                yield f'data: {json.dumps({"type": "metadata", "action_type": "general", "safety_guard_triggered": True, "blocked_reason": blocked_reason, "location_extracted": city, "intent_detected": "general"})}\n\n'
                yield f'data: {json.dumps({"type": "cards", "cards": []})}\n\n'
                yield f'data: {json.dumps({"type": "suggestions", "suggestions": []})}\n\n'
                yield 'data: {"type": "done"}\n\n'
                return
            
            # Get safety snapshot
            safety_snapshot = _safe_city_safety_snapshot(city)
            normalized = _normalize_snapshot(safety_snapshot, city)
            intent = detect_intent(query)
            
            # Check for critical conditions
            critical = check_critical(normalized)
            if critical:
                text = critical["message"]
                yield f'data: {json.dumps({"type": "chunk", "text": text})}\n\n'
            else:
                # Build prompt and get response from Gemini
                profile_dict = {"type": profile} if profile else None
                prompt = build_prompt(normalized, query, intent, profile_dict)
                ai_sections = normalize_sections(generate_response(prompt))
                sections = ai_sections or build_fallback_sections(
                    normalized,
                    query,
                    intent,
                    profile_dict,
                )
                text = render_sections(sections)
                
                # Stream the text (in real implementation, you'd stream Gemini response word by word)
                # For now, send it as a single chunk
                yield f'data: {json.dumps({"type": "chunk", "text": text})}\n\n'
            
            # Determine cards to inject
            cards = _determine_cards_from_response(text, query)
            suggestions = _generate_suggestions(query, intent, city)
            
            # Send metadata
            yield f'data: {json.dumps({"type": "metadata", "action_type": _action_type_from_intent(intent), "safety_guard_triggered": False, "blocked_reason": None, "location_extracted": city, "intent_detected": intent})}\n\n'
            
            # Send cards
            yield f'data: {json.dumps({"type": "cards", "cards": cards})}\n\n'
            
            # Send suggestions
            yield f'data: {json.dumps({"type": "suggestions", "suggestions": suggestions})}\n\n'
            
            # Send done signal
            yield 'data: {"type": "done"}\n\n'
            
        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'
    
    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _determine_cards_from_response(response: str, query: str) -> list[str]:
    """Determine which rich cards to inject based on response content"""
    cards = []
    text_lower = str(response).lower()
    
    if "aqi" in text_lower or "air" in text_lower or "pollution" in text_lower:
        cards.append("aqi")
    if "temperature" in text_lower or "weather" in text_lower or "cold" in text_lower or "hot" in text_lower:
        cards.append("weather")
    if "water" in text_lower or "groundwater" in text_lower:
        cards.append("water")
    if "vs" in query.lower() or "compare" in query.lower():
        cards.append("comparison")
    if "forecast" in text_lower or "hours" in text_lower:
        cards.append("timeline")
    
    return cards[:3]  # Return max 3 cards


def _generate_suggestions(query: str, intent: str, city: str) -> list[str]:
    """Generate contextual follow-up suggestions"""
    suggestions = []
    query_lower = query.lower()
    intent_lower = (intent or "").lower()
    
    if "aqi" in intent_lower or "air" in query_lower:
        suggestions.extend([
            "What causes high AQI?",
            "Best time to go outside today?",
            "How to protect from pollution?",
        ])
    elif "weather" in intent_lower:
        suggestions.extend([
            "When will temperature drop?",
            "Heat safety tips?",
            "Best indoor activities today?",
        ])
    elif "water" in intent_lower:
        suggestions.extend([
            "State water quality forecast?",
            "Safe drinking water tips?",
            "Groundwater trends analysis?",
        ])
    else:
        suggestions.extend([
            f"Compare {city} with another city?",
            f"Full safety report for {city}?",
            "What can you help me with?",
        ])
    
    return suggestions[:3]


def _safe_city_safety_snapshot(city: str) -> dict:
    try:
        return get_city_safety_snapshot(city, allow_partial=True)
    except Exception:
        return {
            "city": city,
            "formatted_address": city,
            "source": "fallback_error",
            "cache_hit": False,
            "overall": {
                "summary": f"Live safety feeds are temporarily unavailable for {city}.",
            },
            "air": {},
            "weather": {},
            "water": {},
            "alerts": [],
            "prediction": "Unknown",
        }


def _action_type_from_intent(intent: str) -> str:
    normalized = (intent or "general").lower()
    if "air" in normalized or "aqi" in normalized:
        return "aqi_query"
    if "weather" in normalized:
        return "weather_query"
    if "health" in normalized:
        return "health_advice"
    if "emergency" in normalized:
        return "emergency"
    if "water" in normalized:
        return "water_query"
    return "general"


def _blocked_reason(query: str) -> str | None:
    text = query.lower()
    rules = [
        (["diagnose", "diagnosis", "what disease"], "Medical diagnosis requests are blocked."),
        (["guarantee", "100% sure", "certain prediction"], "Guaranteed predictions are blocked."),
        (["medication", "dose", "tablet", "prescribe"], "Medication recommendations are blocked."),
        (["self-harm", "kill myself", "suicide"], "Self-harm related requests are blocked."),
    ]
    for keywords, reason in rules:
        if any(keyword in text for keyword in keywords):
            return reason
    return None


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
