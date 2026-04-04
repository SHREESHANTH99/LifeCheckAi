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


@router.get("/predict")
def predict(state: str = Query(..., description="State name, e.g. Delhi")):
    """ML prediction of water drinkability for a state."""
    resolved = resolve_state_name(state)
    if not resolved:
        raise HTTPException(404, f"State '{state}' not found in data")

    result = ml_service.predict_for_state(resolved)
    if not result:
        raise HTTPException(404, f"No water data for state '{resolved}'")

    return result


@router.get("/trends")
def trends(state: str = Query(..., description="State name")):
    """Year-over-year parameter trends for a state."""
    resolved = resolve_state_name(state)
    if not resolved:
        raise HTTPException(404, f"State '{state}' not found in data")

    result = ml_service.get_trends(resolved)
    if not result:
        raise HTTPException(404, f"No trend data for state '{resolved}'")

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
