from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from lifecheckai.backend.app.services import ml_service
from lifecheckai.backend.app.services.water_service import (
    get_available_states,
    resolve_state_name,
)
from lifecheckai.backend.app.services.gemini_service import analyze_water_quality

router = APIRouter(prefix="/api/water", tags=["water"])


@router.get("/states")
def list_states():
    """Return all states that have water quality data."""
    return {"states": get_available_states()}


@router.get("/stations")
def get_stations(state: str = Query(..., description="Indian state to get stations for")):
    """Return all unique monitoring stations for a given state."""
    return {"stations": ml_service.get_stations_for_state(state)}


@router.get("/predict")
async def predict_water_quality(
    state: str = Query(..., description="Indian state to predict water quality for"),
    location: str | None = Query(None, description="Optional specific district or location within the state"),
):
    """
    Predict water drinkability for a given state and optional location.
    Returns prediction, probabilities, parameter values, and any BIS violations.
    """
    result = ml_service.predict_for_state(state, location)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"No water quality data available for state: {state}"
        )
    return result


@router.get("/trends")
async def get_water_trends(
    state: str = Query(..., description="Indian state to get historical trends for"),
    location: str | None = Query(None, description="Optional specific district or location within the state"),
):
    """
    Get year-over-year trends for all 10 water quality parameters for a given state and optional location.
    """
    result = ml_service.get_trends(state, location)
    if not result:
        raise HTTPException(status_code=404, detail=f"No trends data available for state: {state}")
    return result


@router.get("/model-metrics")
def model_metrics():
    """Return ML model evaluation metrics."""
    return ml_service.get_metrics()


@router.get("/analyze")
def analyze(state: str = Query(..., description="State name")):
    """Gemini AI analysis of water contamination."""
    resolved = resolve_state_name(state)
    if not resolved:
        raise HTTPException(404, f"State '{state}' not found in data")

    prediction = ml_service.predict_for_state(resolved)
    if not prediction:
        raise HTTPException(404, f"No water data for state '{resolved}'")

    analysis = analyze_water_quality(
        state=resolved,
        params=prediction["parameters"],
        violations=prediction["violations"],
    )

    return {
        "state": resolved,
        "prediction": prediction["prediction"],
        "analysis": analysis,
    }
