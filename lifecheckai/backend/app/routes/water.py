from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from lifecheckai.backend.app.services import ml_service
from lifecheckai.backend.app.services.gemini_service import analyze_water_quality
from lifecheckai.backend.app.services.water_service import (
    get_dataset_years,
    get_state_catalog,
    get_station_options,
    resolve_state_name,
)

router = APIRouter(prefix="/api/water", tags=["water"])


@router.get("/states")
def list_states():
    return {
        "states": get_state_catalog(),
        "dataset_years": get_dataset_years(),
        "count": len(get_state_catalog()),
    }


@router.get("/stations")
def get_stations(
    state: str = Query(..., description="Indian state to get monitoring locations for"),
    q: str | None = Query(None, description="Optional client-side search filter"),
):
    resolved_state = resolve_state_name(state)
    if not resolved_state:
        raise HTTPException(status_code=404, detail=f"State '{state}' was not found in the water dataset.")

    stations = get_station_options(resolved_state)
    if q:
        query = q.strip().lower()
        stations = [station for station in stations if query in station["name"].lower()]

    return {
        "state": resolved_state,
        "stations": stations,
        "count": len(stations),
    }


@router.get("/predict")
async def predict_water_quality(
    state: str = Query(..., description="Indian state to predict water quality for"),
    station_id: str | None = Query(None, description="Optional monitoring location identifier"),
    location: str | None = Query(None, description="Optional free-text monitoring location name"),
):
    result = ml_service.predict_for_state(state, location=location, station_id=station_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No water quality data was found for '{state}'.",
        )
    return result


@router.get("/trends")
async def get_water_trends(
    state: str = Query(..., description="Indian state to get historical water trends for"),
    station_id: str | None = Query(None, description="Optional monitoring location identifier"),
    location: str | None = Query(None, description="Optional free-text monitoring location name"),
):
    result = ml_service.get_trends(state, location=location, station_id=station_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No trends data was found for '{state}'.",
        )
    return result


@router.get("/nearby")
def get_nearby_water_quality(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    result = ml_service.get_nearby_insights(lat, lon)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Unable to resolve a nearby monitoring location from the supplied coordinates.",
        )
    return result


@router.get("/model-metrics")
def model_metrics():
    return ml_service.get_metrics()


@router.get("/analyze")
def analyze(
    state: str = Query(..., description="State name"),
    station_id: str | None = Query(None, description="Optional monitoring location identifier"),
    location: str | None = Query(None, description="Optional free-text monitoring location name"),
):
    resolved = resolve_state_name(state)
    if not resolved:
        raise HTTPException(status_code=404, detail=f"State '{state}' was not found in the water dataset.")

    prediction = ml_service.predict_for_state(resolved, location=location, station_id=station_id)
    if not prediction:
        raise HTTPException(status_code=404, detail=f"No water data was found for '{resolved}'.")

    analysis = analyze_water_quality(
        state=resolved,
        params=prediction["parameters"],
        violations=prediction["violations"],
    )

    return {
        "state": resolved,
        "matched_location": prediction.get("matched_location"),
        "prediction": prediction["prediction"],
        "analysis": analysis,
    }
