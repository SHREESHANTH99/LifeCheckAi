def check_critical(data: dict) -> dict | None:
    air = data.get("air") or {}
    weather = data.get("weather") or {}
    water = data.get("water") or {}

    aqi = air.get("aqi")
    if aqi is not None and aqi > 300:
        return {
            "reason": "hazardous_air",
            "message": "Air quality is extremely hazardous. Avoid going outside unless it is absolutely necessary.",
            "recommendation": "Stay indoors, keep windows closed, and use a filtered mask if you must step out.",
        }

    temp = weather.get("temp")
    if temp is not None and temp >= 45:
        return {
            "reason": "extreme_heat",
            "message": "Extreme heat conditions detected. Outdoor exposure is not recommended right now.",
            "recommendation": "Stay indoors, hydrate aggressively, and avoid travel or exercise in peak heat.",
        }

    latest_tds = water.get("latest_tds")
    if latest_tds is not None and latest_tds > 3000:
        return {
            "reason": "unsafe_groundwater",
            "message": "Groundwater readings are far above typical safe dissolved-solids levels.",
            "recommendation": "Do not rely on untreated groundwater for drinking until it is lab-tested or treated.",
        }

    return None
