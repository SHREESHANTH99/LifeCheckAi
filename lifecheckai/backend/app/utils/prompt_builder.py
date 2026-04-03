from __future__ import annotations

import json

SECTION_KEYS = ("summary", "air", "weather", "water", "recommendation")

INTENT_FOCUS = {
    "water": "Focus heavily on groundwater safety and drinking suitability.",
    "air": "Focus on air pollution risk and how it affects exposure.",
    "outdoor": "Focus on outdoor activity safety and practical precautions.",
    "general": "Balance air, weather, and groundwater in a concise way.",
}


def build_prompt(data: dict, query: str, intent: str) -> str:
    prompt_payload = {
        "query": query,
        "intent": intent,
        "location": {
            "requested": data.get("requested_location"),
            "resolved_city": data.get("city"),
            "groundwater_state": data.get("groundwater_state"),
            "formatted_address": data.get("formatted_address"),
        },
        "overall": data.get("overall") or {},
        "air": data.get("air") or {},
        "weather": data.get("weather") or {},
        "water": data.get("water") or {},
    }

    return (
        "You are LifeCheck AI, a professional environmental safety advisor.\n"
        "Use only the provided data. Do not guess or invent missing values.\n"
        f"{INTENT_FOCUS.get(intent, INTENT_FOCUS['general'])}\n"
        "Return only valid JSON with these exact keys: "
        "summary, air, weather, water, recommendation.\n"
        "Each value must be a short plain-text string, ideally 1-2 sentences.\n"
        "Call out uncertainty clearly when data is missing.\n\n"
        f"DATA:\n{json.dumps(prompt_payload, ensure_ascii=True, indent=2)}"
    )


def normalize_sections(candidate: dict | None) -> dict | None:
    if not isinstance(candidate, dict):
        return None

    cleaned: dict[str, str] = {}
    for key in SECTION_KEYS:
        value = candidate.get(key)
        if not isinstance(value, str) or not value.strip():
            return None
        cleaned[key] = " ".join(value.strip().split())

    return cleaned


def build_fallback_sections(data: dict, query: str, intent: str) -> dict:
    air = data.get("air") or {}
    weather = data.get("weather") or {}
    water = data.get("water") or {}
    overall = data.get("overall") or {}

    city = data.get("city") or data.get("requested_location") or "the selected location"
    summary = overall.get("summary") or f"Here is a grounded safety snapshot for {city}."

    if air.get("aqi") is None:
        air_text = "Live air-quality data was unavailable, so pollution risk could not be confirmed."
    else:
        air_text = (
            f"AQI is {air['aqi']} and the air status is {air.get('status', 'Unknown')}."
            f" {air.get('advice', '').strip()}".strip()
        )

    if weather.get("temp") is None:
        weather_text = "Live weather data was unavailable, so temperature-based advice is limited."
    else:
        condition = weather.get("condition") or "current conditions"
        weather_text = (
            f"Temperature is {weather['temp']} C with {condition.lower()}."
            f" {weather.get('advice', '').strip()}".strip()
        )

    if not water:
        water_text = "Groundwater history is not available for this location in the local dataset."
    else:
        trend = water.get("trend", "unknown")
        avg_tds = water.get("avg_tds")
        avg_ph = water.get("avg_ph")
        pieces = [f"Groundwater trend is {trend}"]
        if avg_tds is not None:
            pieces.append(f"average TDS is {avg_tds} mg/L")
        if avg_ph is not None:
            pieces.append(f"average pH is {avg_ph}")
        water_text = ", ".join(pieces) + "."
        advisory = water.get("advisory")
        if advisory:
            water_text = f"{water_text} {advisory}"

    recommendation_map = {
        "water": water.get("advisory") or "Prefer treated or lab-tested water before drinking groundwater directly.",
        "air": air.get("advice") or "Reduce exposure until air data improves.",
        "outdoor": overall.get("summary") or "Check air and heat stress before spending long periods outside.",
        "general": overall.get("summary") or "Use the strongest risk signal above as your decision driver.",
    }

    recommendation = recommendation_map.get(intent, recommendation_map["general"])

    return {
        "summary": summary,
        "air": air_text,
        "weather": weather_text,
        "water": water_text,
        "recommendation": recommendation,
    }


def render_sections(sections: dict) -> str:
    labels = {
        "summary": "Summary",
        "air": "Air",
        "weather": "Weather",
        "water": "Water",
        "recommendation": "Recommendation",
    }
    return "\n".join(f"{labels[key]}: {sections[key]}" for key in SECTION_KEYS)
