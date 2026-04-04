from __future__ import annotations

import os
from collections import defaultdict
from pathlib import Path
from statistics import mean

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

from lifecheckai.backend.app.services.water_service import (
    PARAM_NAMES,
    get_all_records,
    get_available_states,
)
from lifecheckai.backend.app.services.maps_service import get_coordinates, calculate_distance

# ── BIS IS 10500:2012 Safe Limits ────────────────────────
BIS_LIMITS = {
    "ph_min": 6.5,
    "ph_max": 8.5,
    "nitrate": 45,
    "tds": 2000,
    "fluoride": 1.5,
    "arsenic": 0.05,
    "fecal_coliform": 1,   # ideally 0
    "total_coliform": 10,
    "bod": 5,
    "conductivity": 3000,   # general guidance
}

MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_PATH = MODEL_DIR / "water_quality_model.joblib"

FEATURES = ["ph", "tds", "conductivity", "bod", "nitrate",
            "fecal_coliform", "total_coliform", "fluoride", "arsenic", "temperature", "wqi"]

_model = None
_metrics: dict | None = None


# ── Labelling ────────────────────────────────────────────

def _is_not_drinkable(row: dict) -> bool:
    """Return True if ANY BIS limit is exceeded."""
    ph = row.get("ph")
    if ph is not None and not pd.isna(ph):
        if ph < BIS_LIMITS["ph_min"] or ph > BIS_LIMITS["ph_max"]:
            return True
            
    for param in ("nitrate", "tds", "fluoride", "arsenic", "fecal_coliform",
                  "total_coliform", "bod", "conductivity"):
        val = row.get(param)
        if val is not None and not pd.isna(val) and val > BIS_LIMITS[param]:
            return True
    return False


# ── Training ─────────────────────────────────────────────

def train_model(force: bool = False) -> dict:
    """Train a HistGradientBoosting classifier on all CSV data."""
    global _model, _metrics

    if _model is not None and not force:
        return _metrics

    records = get_all_records()
    if not records:
        return {"error": "No training data available"}

    df = pd.DataFrame(records)

    # Label
    df["label"] = df.apply(lambda r: 1 if _is_not_drinkable(r) else 0, axis=1)

    # Keep only rows with at least 1 valid feature so the tree can split it
    feature_cols = [f for f in FEATURES if f in df.columns]
    df_valid = df.dropna(subset=feature_cols, how='all')

    if len(df_valid) < 20:
        return {"error": f"Insufficient data: {len(df_valid)} rows"}

    # NO median imputation here! HistGradientBoosting natively branches on NaNs.
    X = df_valid[feature_cols]
    y = df_valid["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = HistGradientBoostingClassifier(
        learning_rate=0.1, max_iter=200, early_stopping=True, random_state=42
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "total_samples": len(df_valid),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_importance": {}, # HistGradient doesn't provide easy feature importances without permutation, so we omit for speed
        "class_distribution": {
            "drinkable": int((y == 0).sum()),
            "not_drinkable": int((y == 1).sum()),
        },
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "features": feature_cols, "metrics": metrics}, MODEL_PATH)

    _model = clf
    _metrics = metrics
    return metrics

def _ensure_model():
    """Load or train model on first use."""
    global _model, _metrics
    if _model is not None:
        return

    if MODEL_PATH.exists():
        bundle = joblib.load(MODEL_PATH)
        _model = bundle["model"]
        _metrics = bundle["metrics"]
    else:
        train_model()


import concurrent.futures

def get_stations_for_state(state: str) -> list[str]:
    """Get all unique monitoring locations for a given state."""
    records = get_all_records()
    stations = {r["location"] for r in records if r["state"] == state and r.get("location")}
    return sorted(list(stations))

def _filter_by_location(records: list[dict], state: str, location: str) -> tuple[list[dict], str | None, float | None, list[str]]:
    """Filter records by a specific location name or find nearby records within an adaptive radius."""
    # 1. Check for exact station match first (India-wide supply point discovery)
    search_loc = location.strip().lower()
    all_known_locs = {r["location"].lower(): r["location"] for r in records if r.get("location")}
    
    if search_loc in all_known_locs:
        actual_name = all_known_locs[search_loc]
        filtered = [r for r in records if r.get("location") == actual_name]
        return filtered, actual_name, 0.0, [actual_name]

    # 2. Fallback to physical geocoding discovery
    target_coords = get_coordinates(f"{location}, {state}")
    if not target_coords or target_coords.get("lat") is None:
        return records, None, None, []

    unique_locations = list({r["location"] for r in records if r.get("location")})
    
    def _calc_dist(loc: str):
        # 1. Substring exact match = auto-include (distance 0)
        if location.lower() in loc.lower():
            return loc, 0.0
            
        # 2. Geocoding physical distance
        loc_coords = get_coordinates(f"{loc}, {state}")
        if loc_coords and loc_coords.get("lat") is not None:
            dist = calculate_distance(target_coords["lat"], target_coords["lon"], loc_coords["lat"], loc_coords["lon"])
            return loc, dist
            
        return loc, float('inf')
    
    # Parallelize to rapidly scan all locations in the state
    loc_distances = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_loc = {executor.submit(_calc_dist, loc): loc for loc in unique_locations}
        for future in concurrent.futures.as_completed(future_to_loc):
            loc_distances.append(future.result())
            
    # Sort locations by closest distance
    loc_distances.sort(key=lambda x: x[1])
    
    if not loc_distances or loc_distances[0][1] == float('inf'):
        return records, None, None, []
        
    # Step 1: Collect all locations within base radius (20km)
    base_radius = 20.0
    nearby_locs = {loc for loc, dist in loc_distances if dist <= base_radius}
    filtered_records = [r for r in records if r.get("location") in nearby_locs]
    unique_years = {r["year"] for r in filtered_records}

    # Forceful Adaptive Radius Expansion to guarantee trends
    expansion_radii = [30.0, 100.0, 200.0, 300.0]
    final_radius = base_radius
    
    for r_km in expansion_radii:
        if len(unique_years) >= 4:
            break
        nearby_locs = {loc for loc, dist in loc_distances if dist <= r_km}
        filtered_records = [r for r in records if r.get("location") in nearby_locs]
        unique_years = {r["year"] for r in filtered_records}
        final_radius = r_km
                
    if not nearby_locs:
        nearest_loc, min_dist = loc_distances[0]
        return [r for r in records if r.get("location") == nearest_loc], nearest_loc, min_dist, [nearest_loc]

    min_dist_found = loc_distances[0][1] if loc_distances[0][1] != float('inf') else 0.0
    label = f"{location.upper()} (Region Avg < {int(final_radius)}km)"
    
    # Extract up to 5 closest stations
    closest_stations = []
    for loc, dist in loc_distances:
        if loc in nearby_locs:
            if loc not in closest_stations:
                closest_stations.append(loc)
            if len(closest_stations) >= 5:
                break
                
    return filtered_records, label, min_dist_found, closest_stations

# ── Prediction ───────────────────────────────────────────

def predict_for_state(state: str, location: str | None = None) -> dict | None:
    """Predict water drinkability for a given state (and optionally location) using its latest data."""
    records = [r for r in get_all_records() if r["state"] == state]
    if not records:
        return None
        
    matched_location = None
    distance_km = None
    nearby_stations = []
    
    if location:
        records, matched_location, distance_km, nearby_stations = _filter_by_location(records, state, location)
    else:
        # Include top 10 stations to show where state data flows from
        all_locs = sorted(list({r.get("location") for r in records if r.get("location")}))
        nearby_stations = all_locs[:10]
        
    if not records:
        return None

    # Use latest year's data
    latest_year = max(r["year"] for r in records)
    latest = [r for r in records if r["year"] == latest_year]

    # Aggregate by averaging
    aggregated = {}
    for f in PARAM_NAMES:
        vals = [r[f] for r in latest if r.get(f) is not None]
        aggregated[f] = round(mean(vals), 4) if vals else None

    # Supply default zeroes for missing specific inputs handled properly inside the logic payload map
    from lifecheckai.backend.app.predict import predict_drinkability
    result = predict_drinkability(
        state=state,
        pH=aggregated.get("ph", 7.0) or 7.0,
        TDS=aggregated.get("tds", 250) or 250,
        Fluoride=aggregated.get("fluoride", 0.5) or 0.5,
        Arsenic=aggregated.get("arsenic", 0.005) or 0.005,
        Nitrate=aggregated.get("nitrate", 10.0) or 10.0,
        BOD=aggregated.get("bod", 2.0) or 2.0,
        Conductivity=aggregated.get("conductivity", 500) or 500,
        Temp=aggregated.get("temperature", 25.0) or 25.0,
        Fecal_Coliform=aggregated.get("fecal_coliform", 0) or 0,
        Total_Coliform=aggregated.get("total_coliform", 0) or 0,
        year=latest_year,
    )
    
    if not result:
        return None

    return {
        "state": state,
        "matched_location": matched_location,
        "distance_km": distance_km,
        "nearby_stations": nearby_stations,
        "year": latest_year,
        "sample_count": len(latest),
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "drinkable_probability": result["drinkability_probability"],
        "not_drinkable_probability": result["not_drinkable_probability"],
        "risk_level": result["risk_level"],
        "parameters": aggregated,
        "violations": result["violations"],
        "bis_limits": BIS_LIMITS,
        "recommendations": result["recommendations"],
    }


# ── Trends ───────────────────────────────────────────────

def get_trends(state: str, location: str | None = None) -> dict | None:
    """Return year-over-year averages for each parameter."""
    records = [r for r in get_all_records() if r["state"] == state]
    if not records:
        return None
        
    matched_location = None
    distance_km = None
    nearby_stations = []
    
    if location:
        records, matched_location, distance_km, nearby_stations = _filter_by_location(records, state, location)
    else:
        all_locs = sorted(list({r.get("location") for r in records if r.get("location")}))
        nearby_stations = all_locs[:10]
        
    if not records:
        return None

    by_year: dict[int, list[dict]] = defaultdict(list)
    for r in records:
        by_year[r["year"]].append(r)

    years = sorted(by_year.keys())
    trends: dict[str, list] = {p: [] for p in PARAM_NAMES}
    trend_years: list[int] = []

    for year in years:
        year_records = by_year[year]
        trend_years.append(year)
        for p in PARAM_NAMES:
            vals = [r[p] for r in year_records if r.get(p) is not None]
            trends[p].append(round(mean(vals), 4) if vals else None)

    return {
        "state": state,
        "matched_location": matched_location,
        "distance_km": distance_km,
        "nearby_stations": nearby_stations,
        "years": trend_years,
        "parameters": trends,
        "sample_counts": {y: len(by_year[y]) for y in years},
    }

# ── Metrics ──────────────────────────────────────────────

def get_metrics() -> dict:
    """Return model evaluation metrics."""
    _ensure_model()
    return _metrics or {"error": "Model not trained"}
