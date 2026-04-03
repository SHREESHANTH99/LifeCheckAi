# ─────────────────────────────────────────
# AIR QUALITY RULES
# ─────────────────────────────────────────

def air_safety(aqi: int | None) -> dict:
    if aqi is None:
        return {"level": "Unknown", "safe": None, "advice": "Data unavailable"}

    if aqi <= 50:
        return {
            "level": "Good",
            "safe": True,
            "advice": "Air quality is good. Safe to go outside."
        }
    elif aqi <= 100:
        return {
            "level": "Moderate",
            "safe": True,
            "advice": "Air quality is acceptable. Sensitive groups should limit prolonged outdoor activity."
        }
    elif aqi <= 150:
        return {
            "level": "Unhealthy (Sensitive)",
            "safe": False,
            "advice": "Unhealthy for sensitive groups. Wear a mask if going out."
        }
    elif aqi <= 200:
        return {
            "level": "Unhealthy",
            "safe": False,
            "advice": "Air is unhealthy. Limit outdoor activity. Use N95 mask."
        }
    elif aqi <= 300:
        return {
            "level": "Very Unhealthy",
            "safe": False,
            "advice": "Very unhealthy air. Avoid going outdoors. Close windows."
        }
    else:
        return {
            "level": "Hazardous",
            "safe": False,
            "advice": "HAZARDOUS conditions. Stay indoors. Seek medical help if breathing issues arise."
        }


# ─────────────────────────────────────────
# WEATHER RULES
# ─────────────────────────────────────────

def weather_safety(temp: float | None, condition: str = "") -> dict:
    if temp is None:
        return {"level": "Unknown", "safe": None, "advice": "Weather data unavailable"}

    condition_lower = condition.lower()

    # Condition-based checks
    if any(word in condition_lower for word in ["thunderstorm", "tornado", "hurricane"]):
        return {
            "level": "Dangerous",
            "safe": False,
            "advice": "Severe weather detected. Stay indoors. Avoid travel."
        }

    if "heavy rain" in condition_lower or "flood" in condition_lower:
        return {
            "level": "High Risk",
            "safe": False,
            "advice": "Heavy rain/flood risk. Avoid low-lying areas and travel."
        }

    # Temperature-based checks
    if temp >= 45:
        return {
            "level": "Extreme Heat",
            "safe": False,
            "advice": "Extreme heatwave. Stay indoors. Drink water. Avoid outdoor work."
        }
    elif temp >= 40:
        return {
            "level": "Heat Risk",
            "safe": False,
            "advice": "Very hot. Limit outdoor activity. Stay hydrated. Wear light clothing."
        }
    elif temp <= 0:
        return {
            "level": "Freezing",
            "safe": False,
            "advice": "Freezing temperatures. Risk of frostbite. Wear layers."
        }
    elif temp <= 5:
        return {
            "level": "Cold Risk",
            "safe": False,
            "advice": "Very cold. Wear warm clothing. Vulnerable groups stay indoors."
        }
    else:
        return {
            "level": "Normal",
            "safe": True,
            "advice": "Weather conditions are normal. Safe to go outside."
        }


# ─────────────────────────────────────────
# POLLEN RULES
# ─────────────────────────────────────────

def pollen_safety(pollen_data: dict | None) -> dict:
    if not pollen_data:
        return {"level": "Unknown", "advice": "Pollen data unavailable"}

    # Find highest pollen level
    max_level = 0
    worst_type = "Unknown"

    for ptype, info in pollen_data.items():
        level = info.get("level") or 0
        if level > max_level:
            max_level = level
            worst_type = ptype

    if max_level == 0:
        return {"level": "None", "advice": "No significant pollen. Safe for allergy sufferers."}
    elif max_level <= 2:
        return {"level": "Low", "advice": f"Low {worst_type} pollen. Allergy sufferers can go out with minimal precaution."}
    elif max_level <= 3:
        return {"level": "Moderate", "advice": f"Moderate {worst_type} pollen. Take antihistamines before going out."}
    elif max_level <= 4:
        return {"level": "High", "advice": f"High {worst_type} pollen. Allergy sufferers should limit outdoor time."}
    else:
        return {"level": "Very High", "advice": f"Very high {worst_type} pollen. Stay indoors if allergic."}


# ─────────────────────────────────────────
# OVERALL SAFETY SCORE
# ─────────────────────────────────────────

def overall_safety(air: dict, weather: dict, pollen: dict) -> dict:
    """
    Combines all checks into one final safety verdict.
    """
    all_safe = [
        air.get("safe"),
        weather.get("safe")
    ]

    if all(s is True for s in all_safe if s is not None):
        return {
            "verdict": "SAFE",
            "color": "green",
            "summary": "Conditions are safe for outdoor activity."
        }
    elif any(s is False for s in all_safe):
        return {
            "verdict": "UNSAFE",
            "color": "red",
            "summary": "One or more conditions make it unsafe to go outside."
        }
    else:
        return {
            "verdict": "CAUTION",
            "color": "yellow",
            "summary": "Exercise caution. Check individual alerts."
        }