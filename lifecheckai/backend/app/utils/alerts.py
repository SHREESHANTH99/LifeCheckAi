from __future__ import annotations


def generate_alerts(data: dict) -> list[dict]:
    alerts: list[dict] = []

    air = data.get("air") or {}
    weather = data.get("weather") or {}
    water = data.get("water") or {}

    aqi = air.get("aqi")
    if aqi is not None and aqi > 200:
        alerts.append(
            {
                "type": "air",
                "level": "high",
                "message": "Hazardous air quality",
            }
        )

    temp = weather.get("temp")
    if temp is not None and temp > 42:
        alerts.append(
            {
                "type": "weather",
                "level": "critical",
                "message": "Extreme heat",
            }
        )

    if water and water.get("trend") == "worsening":
        alerts.append(
            {
                "type": "water",
                "level": "watch",
                "message": "Water quality deteriorating",
            }
        )

    return alerts
