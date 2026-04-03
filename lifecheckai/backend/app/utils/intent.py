def detect_intent(query: str) -> str:
    q = query.lower()

    if any(word in q for word in ["drink", "groundwater", "ground water", "tap", "water"]):
        return "water"

    if any(word in q for word in ["outside", "go out", "travel", "walk", "jog", "outdoor"]):
        return "outdoor"

    if any(word in q for word in ["air", "pollution", "smog", "aqi"]):
        return "air"

    return "general"
