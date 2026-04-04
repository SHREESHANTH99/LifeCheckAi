from fastapi import APIRouter, Query

from lifecheckai.backend.app.services.runtime_state import get_snapshot_history

router = APIRouter(prefix="/api", tags=["History"])


@router.get("/history")
def history(
    cities: str = Query(..., description="Comma-separated city list"),
    limit: int = Query(60, ge=1, le=240),
):
    selected = [city.strip() for city in cities.split(",") if city.strip()]
    return {
        "cities": get_snapshot_history(selected, limit=limit),
    }
