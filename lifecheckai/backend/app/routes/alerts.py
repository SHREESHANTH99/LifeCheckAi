from fastapi import APIRouter

from lifecheckai.backend.app.models.safety_model import AlertFeedResponse, AlertItem
from lifecheckai.backend.app.services.db_service import get_all_cities
from lifecheckai.backend.app.services.runtime_state import get_alert_history

router = APIRouter(prefix="/api", tags=["Alerts"])


@router.get("/alerts/live", response_model=AlertFeedResponse)
def live_alerts() -> AlertFeedResponse:
    active: list[AlertItem] = []

    for city_entry in get_all_cities():
        data = city_entry.get("data", {})
        for alert in data.get("alerts", []):
            active.append(
                AlertItem(
                    city=data.get("city") or city_entry.get("city"),
                    type=alert.get("type", "general"),
                    level=alert.get("level", "info"),
                    message=alert.get("message", ""),
                    timestamp=alert.get("timestamp"),
                )
            )

    history = [AlertItem(**alert) for alert in get_alert_history()]
    return AlertFeedResponse(active=active, history=history)
