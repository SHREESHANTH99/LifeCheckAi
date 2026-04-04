def predict_aqi(history: list[int | float]) -> str:
    if len(history) < 2:
        return "Unknown"

    if history[-1] > history[-2]:
        return "Increasing pollution"

    return "Stable"
