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

def _filter_by_location(records: list[dict], state: str, location: str) -> tuple[list[dict], str | None, float | None]:
    target_coords = get_coordinates(f"{location}, {state}")
    if not target_coords or target_coords.get("lat") is None:
        return records, None, None

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
        return records, None, None
        
    # Step 1: Collect all locations within base radius (20km)
    base_radius = 20.0
    nearby_locs = {loc for loc, dist in loc_distances if dist <= base_radius}
    filtered_records = [r for r in records if r.get("location") in nearby_locs]
    unique_years = {r["year"] for r in filtered_records}

    # Step 2: Adaptive Radius Expansion for Sparse Historical Data
    # For large cities missing smooth trends, expand until we capture >= 4 years of data
    expansion_radii = [50.0, 100.0, 150.0, 250.0]
    final_radius = base_radius
    
    for r_km in expansion_radii:
        if len(unique_years) >= 4:
            break
        nearby_locs = {loc for loc, dist in loc_distances if dist <= r_km}
        filtered_records = [r for r in records if r.get("location") in nearby_locs]
        unique_years = {r["year"] for r in filtered_records}
        final_radius = r_km
                
    if not nearby_locs:
        # Fallback to absolute nearest if none within 250km
        nearest_loc, min_dist = loc_distances[0]
        return [r for r in records if r.get("location") == nearest_loc], nearest_loc, min_dist

    # Use true minimum distance for display, unless substring matched 0
    min_dist_found = loc_distances[0][1] if loc_distances[0][1] != float('inf') else 0.0
    label = f"{location.upper()} (Region Avg < {int(final_radius)}km)"
    return filtered_records, label, min_dist_found


# ── Prediction ───────────────────────────────────────────

def predict_for_state(state: str, location: str | None = None) -> dict | None:
    """Predict water drinkability for a given state (and optionally location) using its latest data."""
    _ensure_model()
    if _model is None:
        return None

    records = [r for r in get_all_records() if r["state"] == state]
    if not records:
        return None
        
    matched_location = None
    distance_km = None
    if location:
        records, matched_location, distance_km = _filter_by_location(records, state, location)
        
    if not records:
        return None

    # Use latest year's data
    latest_year = max(r["year"] for r in records)
    latest = [r for r in records if r["year"] == latest_year]

    # Aggregate by averaging
    bundle = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
    feature_cols = bundle["features"] if bundle else FEATURES

    aggregated = {}
    for f in feature_cols:
        vals = [r[f] for r in latest if r.get(f) is not None]
        aggregated[f] = round(mean(vals), 4) if vals else None

    df_input = pd.DataFrame([aggregated])[feature_cols]

    # Model inherently handles NaNs; no imputation needed.
    prediction = _model.predict(df_input)[0]
    probabilities = _model.predict_proba(df_input)[0]

    # Determine which params exceed BIS limits
    violations = []
    if aggregated.get("ph") is not None:
        if aggregated["ph"] < BIS_LIMITS["ph_min"] or aggregated["ph"] > BIS_LIMITS["ph_max"]:
            violations.append({"param": "pH", "value": aggregated["ph"], "limit": f"{BIS_LIMITS['ph_min']}-{BIS_LIMITS['ph_max']}"})
    for param in ("nitrate", "tds", "fluoride", "arsenic", "fecal_coliform", "total_coliform", "bod", "conductivity"):
        val = aggregated.get(param)
        if val is not None and val > BIS_LIMITS[param]:
            violations.append({"param": param, "value": round(val, 4), "limit": BIS_LIMITS[param]})

    return {
        "state": state,
        "matched_location": matched_location,
        "distance_km": distance_km,
        "year": latest_year,
        "sample_count": len(latest),
        "prediction": "Not Drinkable" if prediction == 1 else "Drinkable",
        "confidence": round(float(max(probabilities)) * 100, 2),
        "drinkable_probability": round(float(probabilities[0]) * 100, 2),
        "not_drinkable_probability": round(float(probabilities[1]) * 100, 2),
        "parameters": aggregated,
        "violations": violations,
        "bis_limits": BIS_LIMITS,
    }


# ── Trends ───────────────────────────────────────────────

def get_trends(state: str, location: str | None = None) -> dict | None:
    """Return year-over-year averages for each parameter."""
    records = [r for r in get_all_records() if r["state"] == state]
    if not records:
        return None
        
    matched_location = None
    distance_km = None
    if location:
        records, matched_location, distance_km = _filter_by_location(records, state, location)
        
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
        "years": trend_years,
        "parameters": trends,
        "sample_counts": {y: len(by_year[y]) for y in years},
    }

# ── Metrics ──────────────────────────────────────────────

def get_metrics() -> dict:
    """Return model evaluation metrics."""
    _ensure_model()
    return _metrics or {"error": "Model not trained"}
