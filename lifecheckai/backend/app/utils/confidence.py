def compute_confidence(data: dict) -> int:
    score = 100

    air = data.get("air") or {}
    weather = data.get("weather") or {}
    water = data.get("water") or {}

    if air.get("aqi") is None:
        score -= 30

    if weather.get("temp") is None:
        score -= 30

    if not water:
        score -= 20
    else:
        if water.get("avg_tds") is None:
            score -= 10
        if water.get("avg_ph") is None:
            score -= 5
        if water.get("year_count", 0) < 2:
            score -= 5

    if not data.get("formatted_address"):
        score -= 5

    return max(score, 0)
