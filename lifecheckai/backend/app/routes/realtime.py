from fastapi import APIRouter
from lifecheckai.backend.app.services.db_service import get_all_cities

router = APIRouter(prefix="/realtime", tags=["Realtime"])

@router.get("/snapshot")
def snapshot():
    """
    Returns latest snapshot of all cities.
    Frontend polls this every 60s for live updates.
    """
    return {
        "cities": get_all_cities()
    }