from __future__ import annotations

import os
from collections import defaultdict
from pathlib import Path
from statistics import mean

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
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
            "fecal_coliform", "total_coliform", "fluoride", "arsenic", "temperature"]

_model = None
_metrics: dict | None = None


# ── Labelling ────────────────────────────────────────────

def _is_not_drinkable(row: dict) -> bool:
    """Return True if ANY BIS limit is exceeded."""
    ph = row.get("ph")
    if ph is not None and (ph < BIS_LIMITS["ph_min"] or ph > BIS_LIMITS["ph_max"]):
        return True
    for param in ("nitrate", "tds", "fluoride", "arsenic", "fecal_coliform",
                  "total_coliform", "bod", "conductivity"):
        val = row.get(param)
        if val is not None and val > BIS_LIMITS[param]:
            return True
    return False


# ── Training ─────────────────────────────────────────────

def train_model(force: bool = False) -> dict:
    """Train a Random Forest classifier on all CSV data."""
    global _model, _metrics

    if _model is not None and not force:
        return _metrics

    records = get_all_records()
    if not records:
        return {"error": "No training data available"}

    df = pd.DataFrame(records)

    # Label
    df["label"] = df.apply(lambda r: 1 if _is_not_drinkable(r) else 0, axis=1)

    # Keep only rows with at least 3 non-null features
    feature_cols = [f for f in FEATURES if f in df.columns]
    df_valid = df.dropna(subset=feature_cols, thresh=3)

    if len(df_valid) < 20:
        return {"error": f"Insufficient data: {len(df_valid)} rows"}

    X = df_valid[feature_cols].fillna(df_valid[feature_cols].median())
    y = df_valid["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
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
        "feature_importance": {
            name: round(imp, 4)
            for name, imp in zip(feature_cols, clf.feature_importances_)
        },
        "class_distribution": {
            "drinkable": int((y == 0).sum()),
            "not_drinkable": int((y == 1).sum()),
        },
    }

    # Save model
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


# ── Prediction ───────────────────────────────────────────

def predict_for_state(state: str) -> dict | None:
    """Predict water drinkability for a given state using its latest data."""
    _ensure_model()
    if _model is None:
        return None

    records = [r for r in get_all_records() if r["state"] == state]
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

    # Fill missing with training median
    all_records = get_all_records()
    df_all = pd.DataFrame(all_records)
    medians = df_all[feature_cols].median()
    df_input = df_input.fillna(medians)

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

def get_trends(state: str) -> dict | None:
    """Return year-over-year averages for each parameter."""
    records = [r for r in get_all_records() if r["state"] == state]
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
        "years": trend_years,
        "parameters": trends,
        "sample_counts": {y: len(by_year[y]) for y in years},
    }


# ── Metrics ──────────────────────────────────────────────

def get_metrics() -> dict:
    """Return model evaluation metrics."""
    _ensure_model()
    return _metrics or {"error": "Model not trained"}
