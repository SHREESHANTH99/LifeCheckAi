from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from lifecheckai.backend.app.services.water_service import (
    DATA_GLOB,
    DATA_PATH,
    PARAMETER_COLUMN_MAP,
    PARAMETER_RANGE_COLUMN_MAP,
    PARAM_NAMES,
    get_available_states,
    get_dataset_years,
    get_water_dataframe,
    select_records,
    select_records_by_coordinates,
)

MODEL_VERSION = "water-random-forest-v2"
MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_PATH = MODEL_DIR / "water_quality_model.joblib"

BASE_FEATURE_COLUMNS = [
    "Year",
    "Temp_Min_C",
    "Temp_Max_C",
    "Temp_Mean",
    "pH_Min",
    "pH_Max",
    "pH_Mean",
    "Conductivity_Min",
    "Conductivity_Max",
    "Conductivity_Mean",
    "BOD_Min",
    "BOD_Max",
    "BOD_Mean",
    "NitrateN_NitriteN_Min",
    "NitrateN_NitriteN_Max",
    "NitrateN_NitriteN_Mean",
    "Fecal_Coliform_Min",
    "Fecal_Coliform_Max",
    "Fecal_Coliform_Mean",
    "Total_Coliform_Min",
    "Total_Coliform_Max",
    "Total_Coliform_Mean",
    "TDS_Min",
    "TDS_Max",
    "TDS_Mean",
    "Fluoride_Min",
    "Fluoride_Max",
    "Fluoride_Mean",
    "Arsenic_Min",
    "Arsenic_Max",
    "Arsenic_Mean",
]

FEATURE_COLUMNS = BASE_FEATURE_COLUMNS + [
    "State_Code",
    "Temp_Range",
    "pH_Range",
    "Conductivity_Range",
    "BOD_Range",
    "Nitrate_Range",
    "Fecal_Range",
    "Total_Coliform_Range",
    "TDS_Range",
    "Fluoride_Range",
    "Arsenic_Range",
    "pH_Deviation",
    "TDS_Conductivity_Ratio",
    "BOD_Nitrate_Ratio",
    "Fecal_Total_Ratio",
]

PARAMETER_GUIDELINES: dict[str, dict[str, Any]] = {
    "temperature": {
        "label": "Temperature",
        "unit": "C",
        "ideal_max": 30.0,
        "critical_max": 35.0,
    },
    "ph": {
        "label": "pH",
        "unit": "",
        "ideal_min": 6.5,
        "ideal_max": 8.5,
        "critical_min": 6.5,
        "critical_max": 8.5,
    },
    "conductivity": {
        "label": "Conductivity",
        "unit": "uS/cm",
        "ideal_max": 1500.0,
        "critical_max": 3000.0,
    },
    "bod": {
        "label": "BOD",
        "unit": "mg/L",
        "ideal_max": 3.0,
        "critical_max": 5.0,
    },
    "nitrate": {
        "label": "Nitrate",
        "unit": "mg/L",
        "ideal_max": 45.0,
        "critical_max": 45.0,
    },
    "fecal_coliform": {
        "label": "Fecal Coliform",
        "unit": "MPN/100mL",
        "ideal_max": 0.0,
        "critical_max": 10.0,
    },
    "total_coliform": {
        "label": "Total Coliform",
        "unit": "MPN/100mL",
        "ideal_max": 0.0,
        "critical_max": 50.0,
    },
    "tds": {
        "label": "TDS",
        "unit": "mg/L",
        "ideal_max": 500.0,
        "critical_max": 2000.0,
    },
    "fluoride": {
        "label": "Fluoride",
        "unit": "mg/L",
        "ideal_max": 1.0,
        "critical_max": 1.5,
    },
    "arsenic": {
        "label": "Arsenic",
        "unit": "mg/L",
        "ideal_max": 0.01,
        "critical_max": 0.01,
    },
}

LABEL_DEFINITION = (
    "Drinkable means the sample stays within BIS flag-based chemistry limits and avoids critical "
    "BOD, conductivity, fecal-coliform, and total-coliform exceedances."
)

_model_bundle: dict[str, Any] | None = None


def _safe_float(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value), 4)


def _dataset_signature(frame: pd.DataFrame) -> dict[str, Any]:
    paths = sorted(DATA_PATH.glob(DATA_GLOB))
    latest_modified = max((int(path.stat().st_mtime) for path in paths), default=0)
    return {
        "row_count": int(len(frame)),
        "years": get_dataset_years(),
        "state_count": len(get_available_states()),
        "latest_modified": latest_modified,
    }


def _safe_divide(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def _build_labels(frame: pd.DataFrame) -> pd.Series:
    unsafe = pd.Series(False, index=frame.index)

    flag_columns = [
        "TDS_Exceeds_BIS",
        "pH_Exceeds_BIS",
        "Fluoride_Exceeds_BIS",
        "Arsenic_Exceeds_BIS",
        "NitrateN_NitriteN_Exceeds_BIS",
    ]
    for column in flag_columns:
        if column in frame.columns:
            unsafe = unsafe | (pd.to_numeric(frame[column], errors="coerce").fillna(0) > 0)

    if "pH_Exceeds_BIS" not in frame.columns and "pH_Mean" in frame.columns:
        ph_values = pd.to_numeric(frame["pH_Mean"], errors="coerce")
        unsafe = unsafe | ((ph_values < 6.5) | (ph_values > 8.5)).fillna(False)

    unsafe = unsafe | (pd.to_numeric(frame.get("BOD_Mean"), errors="coerce") > 5).fillna(False)
    unsafe = unsafe | (pd.to_numeric(frame.get("Conductivity_Mean"), errors="coerce") > 3000).fillna(False)
    unsafe = unsafe | (pd.to_numeric(frame.get("Fecal_Coliform_Mean"), errors="coerce") > 10).fillna(False)
    unsafe = unsafe | (pd.to_numeric(frame.get("Total_Coliform_Mean"), errors="coerce") > 50).fillna(False)

    return (~unsafe).astype(int)


def _prepare_feature_frame(
    frame: pd.DataFrame,
    state_mapping: dict[str, int] | None = None,
) -> tuple[pd.DataFrame, dict[str, int]]:
    working = frame.copy()

    for column in BASE_FEATURE_COLUMNS:
        if column not in working.columns:
            working[column] = np.nan
        working[column] = pd.to_numeric(working[column], errors="coerce")

    if state_mapping is None:
        states = sorted(str(state).strip() for state in working["State"].fillna("").unique().tolist() if str(state).strip())
        state_mapping = {state: index for index, state in enumerate(states)}

    working["State_Code"] = working["State"].map(state_mapping).fillna(-1)

    working["Temp_Range"] = working["Temp_Max_C"] - working["Temp_Min_C"]
    working["pH_Range"] = working["pH_Max"] - working["pH_Min"]
    working["Conductivity_Range"] = working["Conductivity_Max"] - working["Conductivity_Min"]
    working["BOD_Range"] = working["BOD_Max"] - working["BOD_Min"]
    working["Nitrate_Range"] = working["NitrateN_NitriteN_Max"] - working["NitrateN_NitriteN_Min"]
    working["Fecal_Range"] = working["Fecal_Coliform_Max"] - working["Fecal_Coliform_Min"]
    working["Total_Coliform_Range"] = working["Total_Coliform_Max"] - working["Total_Coliform_Min"]
    working["TDS_Range"] = working["TDS_Max"] - working["TDS_Min"]
    working["Fluoride_Range"] = working["Fluoride_Max"] - working["Fluoride_Min"]
    working["Arsenic_Range"] = working["Arsenic_Max"] - working["Arsenic_Min"]
    working["pH_Deviation"] = (working["pH_Mean"] - 7.0).abs()
    working["TDS_Conductivity_Ratio"] = _safe_divide(working["TDS_Mean"], working["Conductivity_Mean"])
    working["BOD_Nitrate_Ratio"] = _safe_divide(working["BOD_Mean"], working["NitrateN_NitriteN_Mean"])
    working["Fecal_Total_Ratio"] = _safe_divide(
        working["Fecal_Coliform_Mean"],
        working["Total_Coliform_Mean"],
    )

    return working[FEATURE_COLUMNS].copy(), state_mapping


def train_model(force: bool = False) -> dict:
    global _model_bundle

    if _model_bundle is not None and not force:
        return dict(_model_bundle["metrics"])

    frame = get_water_dataframe()
    if frame.empty:
        return {"error": "No water quality data found."}

    labels = _build_labels(frame)
    feature_frame, state_mapping = _prepare_feature_frame(frame)
    valid_mask = feature_frame.notna().any(axis=1)

    X = feature_frame.loc[valid_mask].copy()
    y = labels.loc[valid_mask].astype(int)
    if len(X) < 50 or y.nunique() < 2:
        return {"error": "Insufficient training data for a stable binary model."}

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=250,
                    max_depth=18,
                    min_samples_leaf=2,
                    min_samples_split=4,
                    class_weight="balanced_subsample",
                    bootstrap=True,
                    oob_score=True,
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )
    pipeline.fit(X_train, y_train)

    probabilities = pipeline.predict_proba(X_test)
    classes = list(pipeline.named_steps["model"].classes_)
    drinkable_index = classes.index(1)

    y_pred = pipeline.predict(X_test)
    y_prob = probabilities[:, drinkable_index]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, y_prob), 4),
        "oob_score": round(float(pipeline.named_steps["model"].oob_score_), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "total_samples": int(len(X)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "class_distribution": {
            "drinkable": int((y == 1).sum()),
            "not_drinkable": int((y == 0).sum()),
        },
        "feature_importance": {
            feature: round(float(importance), 4)
            for feature, importance in sorted(
                zip(FEATURE_COLUMNS, pipeline.named_steps["model"].feature_importances_),
                key=lambda item: item[1],
                reverse=True,
            )
        },
        "dataset_years": get_dataset_years(),
        "label_definition": LABEL_DEFINITION,
        "model_version": MODEL_VERSION,
    }

    bundle = {
        "model": pipeline,
        "feature_columns": FEATURE_COLUMNS,
        "state_mapping": state_mapping,
        "metrics": metrics,
        "dataset_signature": _dataset_signature(frame),
        "model_version": MODEL_VERSION,
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    _model_bundle = bundle
    return dict(metrics)


def _ensure_model() -> dict[str, Any]:
    global _model_bundle
    if _model_bundle is not None:
        return _model_bundle

    frame = get_water_dataframe()
    if MODEL_PATH.exists():
        try:
            bundle = joblib.load(MODEL_PATH)
            if (
                isinstance(bundle, dict)
                and bundle.get("dataset_signature") == _dataset_signature(frame)
                and bundle.get("model_version") == MODEL_VERSION
            ):
                _model_bundle = bundle
                return bundle
        except Exception:
            pass

    train_model(force=True)
    return _model_bundle or {}


def warm_up_model() -> None:
    """Load model into memory eagerly."""
    _ensure_model()


def _aggregate_selection_frame(selection: dict) -> tuple[pd.Series, int, pd.DataFrame]:
    frame = selection["frame"]
    latest_year = int(frame["Year"].dropna().max())
    latest_frame = frame[frame["Year"] == latest_year].copy()
    aggregated = latest_frame.mean(numeric_only=True)
    aggregated["Year"] = latest_year
    aggregated["State"] = selection["state"]
    return aggregated, latest_year, latest_frame


def _extract_parameters(row: pd.Series) -> dict[str, float | None]:
    return {
        parameter: _safe_float(row.get(column))
        for parameter, column in PARAMETER_COLUMN_MAP.items()
    }


def _build_parameter_status(parameter: str, value: float | None) -> dict[str, Any]:
    guideline = PARAMETER_GUIDELINES[parameter]
    status = "unknown"
    message = "No data available for this parameter."

    ideal_min = guideline.get("ideal_min")
    ideal_max = guideline.get("ideal_max")
    critical_min = guideline.get("critical_min", ideal_min)
    critical_max = guideline.get("critical_max", ideal_max)

    if value is not None:
        if critical_min is not None and value < critical_min:
            status = "critical"
            message = f"Below the critical lower bound of {critical_min} {guideline['unit']}".strip()
        elif critical_max is not None and value > critical_max:
            status = "critical"
            message = f"Above the critical upper bound of {critical_max} {guideline['unit']}".strip()
        elif ideal_min is not None and value < ideal_min:
            status = "caution"
            message = f"Below the desirable lower bound of {ideal_min} {guideline['unit']}".strip()
        elif ideal_max is not None and value > ideal_max:
            status = "caution"
            message = f"Above the desirable upper bound of {ideal_max} {guideline['unit']}".strip()
        else:
            status = "normal"
            message = "Within the desirable monitoring range."

    return {
        "param": parameter,
        "label": guideline["label"],
        "unit": guideline["unit"],
        "value": value,
        "status": status,
        "ideal_min": ideal_min,
        "ideal_max": ideal_max,
        "critical_min": critical_min,
        "critical_max": critical_max,
        "message": message,
    }


def _build_recommendations(statuses: list[dict[str, Any]], prediction: str) -> list[str]:
    recommendations: list[str] = []
    status_map = {item["param"]: item for item in statuses}

    if status_map.get("tds", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Use RO or multi-stage filtration to reduce dissolved solids before drinking.")
    if status_map.get("fluoride", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Use activated alumina or RO treatment to reduce fluoride exposure.")
    if status_map.get("arsenic", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Avoid untreated use and prefer certified arsenic-removal filtration immediately.")
    if status_map.get("nitrate", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Avoid giving this water untreated to infants and use low-nitrate treated water instead.")
    if status_map.get("ph", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Check pipe corrosion and neutralize the water before household consumption.")
    if status_map.get("conductivity", {}).get("status") in {"caution", "critical"}:
        recommendations.append("High mineral loading suggests blending or treatment before daily drinking use.")
    if status_map.get("bod", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Elevated organic load suggests contamination. Retest and disinfect before use.")
    if status_map.get("fecal_coliform", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Boil or UV-disinfect the water and avoid direct drinking until retested.")
    if status_map.get("total_coliform", {}).get("status") in {"caution", "critical"}:
        recommendations.append("Inspect storage and supply lines for contamination ingress and retest quickly.")

    if not recommendations and prediction == "Drinkable":
        recommendations.append("The latest monitored profile looks drinkable, but routine filtration and periodic testing are still recommended.")
    elif not recommendations:
        recommendations.append("The model flags this water as risky. Use treated water and confirm with a recent lab test.")

    return recommendations


def _risk_level(drinkable_probability: float) -> str:
    not_drinkable_probability = 1.0 - drinkable_probability
    if not_drinkable_probability >= 0.8:
        return "Very High"
    if not_drinkable_probability >= 0.6:
        return "High"
    if not_drinkable_probability >= 0.35:
        return "Moderate"
    if not_drinkable_probability >= 0.2:
        return "Low"
    return "Minimal"


def _trend_direction(values: list[float | None]) -> str:
    observed = [value for value in values if value is not None]
    if len(observed) < 2:
        return "stable"

    first = observed[0]
    last = observed[-1]
    baseline = max(abs(first), 1.0)
    change_pct = ((last - first) / baseline) * 100
    if abs(change_pct) < 5:
        return "stable"
    return "up" if last > first else "down"


def _build_prediction(selection: dict) -> dict | None:
    bundle = _ensure_model()
    if not bundle or "model" not in bundle:
        return None

    aggregated, latest_year, latest_frame = _aggregate_selection_frame(selection)
    feature_frame = pd.DataFrame(
        [
            {
                **aggregated.to_dict(),
                "State": selection["state"],
            }
        ]
    )
    X_pred, _ = _prepare_feature_frame(feature_frame, bundle["state_mapping"])

    pipeline: Pipeline = bundle["model"]
    probabilities = pipeline.predict_proba(X_pred)[0]
    classes = list(pipeline.named_steps["model"].classes_)
    drinkable_index = classes.index(1)
    drinkable_probability = float(probabilities[drinkable_index])
    not_drinkable_probability = 1.0 - drinkable_probability
    prediction = "Drinkable" if drinkable_probability >= 0.5 else "Not Drinkable"
    confidence = max(drinkable_probability, not_drinkable_probability)

    parameters = _extract_parameters(aggregated)
    parameter_statuses = [_build_parameter_status(parameter, parameters.get(parameter)) for parameter in PARAM_NAMES]
    violations = [status for status in parameter_statuses if status["status"] in {"caution", "critical"}]

    matched_station = selection.get("matched_station")
    matched_station_payload = None
    if matched_station:
        matched_station_payload = {
            "id": matched_station["id"],
            "code": matched_station.get("code"),
            "name": matched_station["name"],
        }

    sample_count = int(len(latest_frame))
    low_sample_warning = False
    if sample_count < 5:
        low_sample_warning = True
        confidence = confidence * max(0.5, sample_count / 5.0)

    return {
        "state": selection["state"],
        "scope": selection["scope"],
        "matched_station": matched_station_payload,
        "matched_location": selection.get("matched_location"),
        "distance_km": selection.get("distance_km"),
        "resolved_place": selection.get("resolved_place"),
        "nearby_stations": selection.get("nearby_stations", []),
        "year": latest_year,
        "available_years": sorted(int(year) for year in selection["frame"]["Year"].dropna().astype(int).unique().tolist()),
        "sample_count": sample_count,
        "station_count": int(latest_frame["station_key"].nunique()) if "station_key" in latest_frame.columns else None,
        "low_sample_warning": low_sample_warning,
        "prediction": prediction,
        "confidence": round(confidence * 100, 2),
        "drinkable_probability": round(drinkable_probability * 100, 2),
        "not_drinkable_probability": round(not_drinkable_probability * 100, 2),
        "risk_level": _risk_level(drinkable_probability),
        "parameters": parameters,
        "parameter_statuses": parameter_statuses,
        "violations": violations,
        "recommendations": _build_recommendations(parameter_statuses, prediction),
        "model_version": bundle.get("model_version", MODEL_VERSION),
    }


def predict_for_state(
    state: str,
    location: str | None = None,
    station_id: str | None = None,
) -> dict | None:
    selection = select_records(state, station_id=station_id, location=location)
    if not selection or selection["frame"].empty:
        return None
    return _build_prediction(selection)


def _build_trends(selection: dict) -> dict | None:
    frame = selection["frame"]
    if frame.empty:
        return None

    years = sorted(int(year) for year in frame["Year"].dropna().astype(int).unique().tolist())
    parameter_series: dict[str, list[float | None]] = {parameter: [] for parameter in PARAM_NAMES}
    sample_counts: dict[str, int] = {}

    for year in years:
        year_frame = frame[frame["Year"] == year]
        sample_counts[str(year)] = int(len(year_frame))
        for parameter, column in PARAMETER_COLUMN_MAP.items():
            value = _safe_float(year_frame[column].mean()) if column in year_frame.columns else None
            parameter_series[parameter].append(value)

    overview = {}
    for parameter, values in parameter_series.items():
        observed = [value for value in values if value is not None]
        latest = observed[-1] if observed else None
        first = observed[0] if observed else None
        overview[parameter] = {
            "latest": latest,
            "first": first,
            "change": round((latest - first), 4) if latest is not None and first is not None else None,
            "direction": _trend_direction(values),
        }

    matched_station = selection.get("matched_station")
    matched_station_payload = None
    if matched_station:
        matched_station_payload = {
            "id": matched_station["id"],
            "code": matched_station.get("code"),
            "name": matched_station["name"],
        }

    return {
        "state": selection["state"],
        "scope": selection["scope"],
        "matched_station": matched_station_payload,
        "matched_location": selection.get("matched_location"),
        "distance_km": selection.get("distance_km"),
        "resolved_place": selection.get("resolved_place"),
        "nearby_stations": selection.get("nearby_stations", []),
        "years": years,
        "parameters": parameter_series,
        "sample_counts": sample_counts,
        "overview": overview,
    }


def get_trends(
    state: str,
    location: str | None = None,
    station_id: str | None = None,
) -> dict | None:
    selection = select_records(state, station_id=station_id, location=location)
    if not selection or selection["frame"].empty:
        return None
    return _build_trends(selection)


def get_nearby_insights(lat: float, lon: float) -> dict | None:
    selection = select_records_by_coordinates(lat, lon)
    if not selection or selection["frame"].empty:
        return None

    prediction = _build_prediction(selection)
    trends = _build_trends(selection)
    if not prediction or not trends:
        return None

    return {
        "resolved_place": selection.get("resolved_place"),
        "prediction": prediction,
        "trends": trends,
    }


def get_metrics() -> dict:
    bundle = _ensure_model()
    if not bundle:
        return {"error": "Model is unavailable."}
    return dict(bundle.get("metrics") or {})
