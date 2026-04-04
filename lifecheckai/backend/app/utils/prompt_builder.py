from __future__ import annotations

import json

SECTION_KEYS = ("summary", "air", "weather", "water", "action")

INTENT_FOCUS = {
    "water": "Focus heavily on groundwater safety and drinking suitability.",
    "air": "Focus on air pollution risk and how it affects exposure.",
    "outdoor": "Focus on outdoor activity safety and practical precautions.",
    "general": "Balance air, weather, and groundwater in a concise way.",
}


def build_prompt(data: dict, query: str, intent: str, user_profile: dict | None) -> str:
    profile_text = json.dumps(user_profile or {"type": "general"}, ensure_ascii=True, indent=2)

    return f"""
SYSTEM:
You are LifeCheck AI, an expert environmental safety assistant.

RULES:
- Use ONLY provided data
- No assumptions
- Be practical and precise

USER PROFILE:
{profile_text}

QUERY:
{query}

INTENT:
{intent}

INTENT FOCUS:
{INTENT_FOCUS.get(intent, INTENT_FOCUS["general"])}

DATA:
{json.dumps(data, ensure_ascii=True, indent=2)}

DECISION LOGIC:
- AQI >150 -> Unsafe
- Temp >40 -> Heat risk
- TDS >500 -> Unsafe water

OUTPUT FORMAT:
Return only valid JSON with these exact keys:
summary, air, weather, water, action

Each field should be a short plain-text string with max 2 lines.
""".strip()


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


def build_fallback_sections(
    data: dict,
    query: str,
    intent: str,
    user_profile: dict | None,
) -> dict:
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

    action_map = {
        "water": water.get("advisory") or "Prefer treated or lab-tested water before drinking groundwater directly.",
        "air": air.get("advice") or "Reduce exposure until air data improves.",
        "outdoor": overall.get("summary") or "Check air and heat stress before spending long periods outside.",
        "general": overall.get("summary") or "Use the strongest risk signal above as your decision driver.",
    }

    action = _apply_profile_precautions(
        action_map.get(intent, action_map["general"]),
        user_profile,
    )

    return {
        "summary": summary,
        "air": air_text,
        "weather": weather_text,
        "water": water_text,
        "action": action,
    }


def render_sections(sections: dict) -> str:
    labels = {
        "summary": "Summary",
        "air": "Air",
        "weather": "Weather",
        "water": "Water",
        "action": "Action",
    }
    return "\n".join(f"{labels[key]}: {sections[key]}" for key in SECTION_KEYS)


def _apply_profile_precautions(action: str, user_profile: dict | None) -> str:
    if not user_profile:
        return action

    profile_type = str(user_profile.get("type", "")).strip().lower()
    if profile_type == "asthma":
        return f"{action} Avoid outdoor exposure spikes and keep rescue medication ready."

    if profile_type in {"elderly", "senior"}:
        return f"{action} Reduce prolonged exposure and prioritize assisted travel if conditions worsen."

    return action
