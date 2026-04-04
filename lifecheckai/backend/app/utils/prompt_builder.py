from __future__ import annotations

import json

SECTION_KEYS = ("summary", "air", "weather", "water", "action")

INTENT_FOCUS = {
    "quick": "Give a direct short answer focused on the user's exact question.",
    "detailed": "Provide a full, structured environmental safety report with concise sections.",
    "water": "Focus heavily on groundwater safety and drinking suitability.",
    "air": "Focus on air pollution risk and how it affects exposure.",
    "weather": "Focus on weather conditions, forecast-linked risk, and practical precautions.",
    "outdoor": "Focus on outdoor activity safety and practical precautions.",
    "general": "Balance air, weather, and groundwater in a concise way.",
}


def build_prompt(data: dict, query: str, intent: str, user_profile: dict | None) -> str:
    profile_text = json.dumps(user_profile or {"type": "general"}, ensure_ascii=True, indent=2)
    mode = intent if intent in INTENT_FOCUS else "quick"

    city = data.get("city") or data.get("requested_location") or "selected location"
    air = data.get("air") or {}
    weather = data.get("weather") or {}
    water = data.get("water") or {}

    base = f"""
SYSTEM:
You are LifeCheck AI, an expert environmental safety assistant.

RULES:
- Use ONLY provided data
- No assumptions
- Be practical, precise, and non-repetitive
- Adapt response style to user intent
- Do NOT reuse identical phrasing across different question types

USER PROFILE:
{profile_text}

QUERY:
{query}

INTENT:
{intent}

INTENT FOCUS:
{INTENT_FOCUS.get(mode, INTENT_FOCUS["quick"])}

LOCATION: {city}

KEY DATA SNAPSHOT:
- AQI: {air.get('aqi')} ({air.get('status')})
- Temperature: {weather.get('temp')} C
- Water trend: {water.get('trend') if water else 'Unknown'}
- Avg TDS: {water.get('avg_tds') if water else 'N/A'}

FULL DATA:
{json.dumps(data, ensure_ascii=True, indent=2)}

IMPORTANT:
- Do NOT always follow the same sentence pattern
- Prioritize the section relevant to the question
- Keep non-primary sections brief when not requested
""".strip()

    mode_task = {
        "quick": """
TASK MODE: QUICK
- Answer in concise style.
- Focus on what user asked first.
- Keep secondary sections to one short line each.
""",
        "outdoor": """
TASK MODE: OUTDOOR
- Focus on outdoor safety decision.
- Provide clear safe/unsafe direction with reason.
- Prioritize air and weather; keep water minimal unless critical.
""",
        "water": """
TASK MODE: WATER
- Focus on drinking and water-safety risk.
- Prioritize water quality trend/TDS/pH interpretation.
- Keep air/weather short unless user explicitly asked for them.
""",
        "air": """
TASK MODE: AIR
- Focus on AQI, pollution drivers, and exposure risk.
- If question asks why/cause, explain drivers rather than generic summary.
""",
        "weather": """
TASK MODE: WEATHER
- Focus on weather conditions and weather-linked risk.
- Emphasize temperature/conditions and practical precautions.
""",
        "detailed": """
TASK MODE: DETAILED
- Provide a full structured report.
- Keep each section concise but specific.
""",
    }.get(mode, "")

    return (
        base
        + "\n\n"
        + mode_task.strip()
        + "\n\nOUTPUT FORMAT:\n"
        + "Return only valid JSON with these exact keys: summary, air, weather, water, action\n"
        + "Use concise plain-text values."
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


def build_fallback_sections(
    data: dict,
    query: str,
    intent: str,
    user_profile: dict | None,
) -> dict:
    query_lower = (query or "").strip().lower()

    is_capability_query = any(token in query_lower for token in [
        "what can you help",
        "what can you do",
        "how can you help",
        "help me with",
        "your capabilities",
        "features",
    ])

    if is_capability_query:
        city = data.get("city") or data.get("requested_location") or "your city"
        return {
            "summary": f"I can help with practical environmental safety decisions for {city}.",
            "air": "Air support: AQI interpretation, pollution-risk explanation, and safer outdoor timing guidance.",
            "weather": "Weather support: heat/cold/storm risk interpretation and actionable precautions.",
            "water": "Water support: groundwater trend interpretation, TDS/pH context, and drinking-safety guidance.",
            "action": "Ask a specific city question like: 'Is it safe to go outside now?' or 'Why is AQI high today?'.",
        }

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

    # Tailor air explanation for causal questions to avoid repeating generic snapshots.
    if intent == "air" and any(token in query_lower for token in ["why", "cause", "causes", "high aqi", "pollution source"]):
        current_aqi = air.get("aqi")
        status = air.get("status", "Unknown")
        if current_aqi is None:
            air_text = (
                "Current AQI is unavailable, so exact causes cannot be confirmed right now. "
                "Common AQI drivers are traffic emissions, construction dust, industrial smoke, and stagnant weather."
            )
        elif current_aqi <= 100:
            air_text = (
                f"Current AQI is {current_aqi} ({status}), so high AQI is not active now. "
                "When AQI spikes, typical drivers include traffic peaks, dust resuspension, industrial emissions, and low wind dispersion."
            )
        else:
            air_text = (
                f"Current AQI is {current_aqi} ({status}), indicating elevated pollution. "
                "Likely contributors include traffic intensity, dust, emissions, and weak atmospheric dispersion conditions."
            )
    elif intent == "air":
        air_text = f"Air-focused answer: {air_text}"

    if weather.get("temp") is None:
        weather_text = "Live weather data was unavailable, so temperature-based advice is limited."
    else:
        condition = weather.get("condition") or "current conditions"
        weather_text = (
            f"Temperature is {weather['temp']} C with {condition.lower()}."
            f" {weather.get('advice', '').strip()}".strip()
        )

    if intent == "weather":
        weather_text = f"Weather-focused answer: {weather_text}"

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

    if intent == "water":
        water_text = f"Water-focused answer: {water_text}"

    action_map = {
        "water": water.get("advisory") or "Prefer treated or lab-tested water before drinking groundwater directly.",
        "air": air.get("advice") or "Reduce exposure until air data improves.",
        "weather": weather.get("advice") or "Plan activities around heat/rain/wind conditions and check updates every few hours.",
        "outdoor": overall.get("summary") or "Check air and heat stress before spending long periods outside.",
        "general": overall.get("summary") or "Use the strongest risk signal above as your decision driver.",
    }

    if intent == "air" and any(token in query_lower for token in ["why", "cause", "causes", "high aqi", "pollution source"]):
        action_map["air"] = (
            "Track AQI during morning/evening traffic peaks, limit outdoor exertion during spikes, "
            "and use a protective mask if AQI trends upward."
        )

    if intent == "water" and any(token in query_lower for token in ["drink", "safe", "drinkable"]):
        action_map["water"] = (
            water.get("advisory")
            or "Do not drink untreated groundwater directly; use filtered or tested water before consumption."
        )

    if intent in {"quick", "general"} and any(token in query_lower for token in ["summary", "full report", "full", "overall"]):
        summary = f"Comprehensive safety summary for {city}: {summary}"

    if intent == "quick":
        summary = f"Quick answer for {city}: {summary}"
        if "air" not in query_lower and "aqi" not in query_lower:
            air_text = "Air context: currently stable. Ask specifically for deeper AQI analysis."
        if "weather" not in query_lower and "temperature" not in query_lower:
            weather_text = "Weather context: no major immediate weather red flags in latest available data."
        if "water" not in query_lower and "drink" not in query_lower and "tap" not in query_lower:
            water_text = "Water context: ask directly if you want drinking-water safety detail."

        action_map["quick"] = "Ask a focused follow-up for deeper analysis (air, weather, or water)."

    if intent == "detailed":
        summary = f"Detailed safety report for {city}: {summary}"
        action_map["detailed"] = (
            "Use this as a full snapshot and prioritize the highest-risk signal before planning activities."
        )

    if intent == "air":
        summary = f"Air-risk answer for {city}: {summary}"
    elif intent == "weather":
        summary = f"Weather-risk answer for {city}: {summary}"
    elif intent == "water":
        summary = f"Water-safety answer for {city}: {summary}"
    elif intent == "outdoor":
        summary = f"Outdoor safety answer for {city}: {summary}"

    # Reduce repetitive feel by deemphasizing non-target sections for focused queries.
    if intent in {"air", "weather", "water", "outdoor"}:
        if intent != "air":
            air_text = f"Secondary context: {air_text}"
        if intent != "weather":
            weather_text = f"Secondary context: {weather_text}"
        if intent != "water":
            water_text = f"Secondary context: {water_text}"

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
