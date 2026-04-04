"""
predict.py — Website Backend Prediction Script
================================================
Call this from your Flask/FastAPI backend when a user
searches for water quality at their location.
"""

import os
from pathlib import Path
import pickle
import numpy as np
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent / "model"

# ── Load saved model artifacts
# Ensure they exist before loading
model = None
preprocessor = None
le_state = None
features = None

def load_models():
    global model, preprocessor, le_state, features
    if model is None and (MODEL_DIR / "water_quality_model.pkl").exists():
        model        = pickle.load(open(MODEL_DIR / "water_quality_model.pkl",  "rb"))
        preprocessor = pickle.load(open(MODEL_DIR / "preprocessor.pkl",         "rb"))
        le_state     = pickle.load(open(MODEL_DIR / "label_encoder.pkl",        "rb"))
        features     = pickle.load(open(MODEL_DIR / "feature_names.pkl",        "rb"))

def predict_drinkability(
    state: str,
    pH: float,
    TDS: float,
    Fluoride: float,
    Arsenic: float,
    Nitrate: float,
    BOD: float,
    Conductivity: float,
    Fecal_Coliform: float = 0,
    Total_Coliform: float = 0,
    Temp: float = 25.0,
    year: int = 2024,
) -> dict:
    load_models()
    if model is None:
        return None

    # Encode state
    try:
        state_enc = le_state.transform([state])[0]
    except ValueError:
        state_enc = -1   # unknown state

    # Build a row matching the training feature set
    row = {
        "Temp_Min_C": Temp - 1,     "Temp_Max_C": Temp + 1,     "Temp_Mean": Temp,
        "pH_Min": pH - 0.1,         "pH_Max": pH + 0.1,         "pH_Mean": pH,
        "Conductivity_Min": Conductivity * 0.95, "Conductivity_Max": Conductivity * 1.05, "Conductivity_Mean": Conductivity,
        "BOD_Min": BOD * 0.9,       "BOD_Max": BOD * 1.1,       "BOD_Mean": BOD,
        "NitrateN_NitriteN_Min": Nitrate * 0.9, "NitrateN_NitriteN_Max": Nitrate * 1.1, "NitrateN_NitriteN_Mean": Nitrate,
        "Fecal_Coliform_Min": Fecal_Coliform, "Fecal_Coliform_Max": Fecal_Coliform, "Fecal_Coliform_Mean": Fecal_Coliform,
        "Total_Coliform_Min": Total_Coliform, "Total_Coliform_Max": Total_Coliform, "Total_Coliform_Mean": Total_Coliform,
        "TDS_Min": TDS * 0.95,      "TDS_Max": TDS * 1.05,      "TDS_Mean": TDS,
        "Fluoride_Min": Fluoride * 0.9, "Fluoride_Max": Fluoride * 1.1, "Fluoride_Mean": Fluoride,
        "Arsenic_Min": Arsenic,     "Arsenic_Max": Arsenic,     "Arsenic_Mean": Arsenic,
        "Year": year,
        # Engineered features
        "Temp_Range": 2, "pH_Range": 0.2, "Conductivity_Range": Conductivity * 0.1,
        "BOD_Range": BOD * 0.2, "TDS_Range": TDS * 0.1,
        "Fluoride_Range": Fluoride * 0.2, "Arsenic_Range": 0,
        "Nitrate_Range": Nitrate * 0.2,
        "TDS_Conductivity_Ratio": TDS / (Conductivity + 1e-6),
        "BOD_Nitrate_Ratio":      BOD / (Nitrate + 1e-6),
        "Fecal_Total_Ratio":      Fecal_Coliform / (Total_Coliform + 1e-6),
        "pH_Deviation":    abs(pH - 7.0),
        "High_TDS":        int(TDS > 500),
        "High_Fluoride":   int(Fluoride > 1.0),
        "High_Arsenic":    int(Arsenic > 0.01),
        "High_Nitrate":    int(Nitrate > 45),
        "Acidic_pH":       int(pH < 6.5),
        "Basic_pH":        int(pH > 8.5),
        "High_BOD":        int(BOD > 3.0),
        "High_Fecal":      int(Fecal_Coliform > 10),
        "State_Enc":       state_enc,
    }

    X = pd.DataFrame([row])[features]
    X_proc = preprocessor.transform(X)

    prediction   = model.predict(X_proc)[0]
    confidence   = model.predict_proba(X_proc)[0][1]

    # Risk level
    if confidence >= 0.80:   risk = "Safe"
    elif confidence >= 0.60: risk = "Low Risk"
    elif confidence >= 0.35: risk = "Medium Risk"
    else:                    risk = "High Risk"

    # Which BIS standards are violated?
    BIS = {
        "pH":        (6.5 <= pH <= 8.5,        f"pH {pH} outside 6.5–8.5"),
        "TDS":       (TDS <= 500,               f"TDS {TDS} mg/L exceeds 500 mg/L"),
        "Fluoride":  (Fluoride <= 1.0,          f"Fluoride {Fluoride} mg/L exceeds 1.0 mg/L"),
        "Arsenic":   (Arsenic <= 0.01,          f"Arsenic {Arsenic} mg/L exceeds 0.01 mg/L"),
        "Nitrate":   (Nitrate <= 45,            f"Nitrate {Nitrate} mg/L exceeds 45 mg/L"),
        "BOD":       (BOD <= 3.0,               f"BOD {BOD} mg/L exceeds 3.0 mg/L"),
        "Fecal":     (Fecal_Coliform == 0,      f"Fecal Coliform detected: {Fecal_Coliform} MPN/100mL"),
    }
    violations = [{"param": param, "value": None, "limit": None} for param, (ok, msg) in BIS.items() if not ok]

    # Recommendations
    recs = []
    if not BIS["TDS"][0]:     recs.append("Use RO filtration to reduce TDS.")
    if not BIS["Fluoride"][0]:recs.append("Use activated alumina filter for Fluoride.")
    if not BIS["Arsenic"][0]: recs.append("Use iron-based coagulation or RO for Arsenic.")
    if not BIS["pH"][0]:      recs.append("pH correction needed — use neutralisation filter.")
    if not BIS["Fecal"][0]:   recs.append("Boil water or use UV/chlorine disinfection.")
    if not violations:        recs.append("Water appears safe. Regular testing recommended.")

    return {
        "prediction": "Drinkable" if prediction else "Not Drinkable",
        "drinkability_probability": round(float(confidence) * 100, 2),
        "not_drinkable_probability": round((1.0 - float(confidence)) * 100, 2),
        "confidence": round(float(confidence) * 100, 2) if prediction else round((1.0 - float(confidence)) * 100, 2),
        "risk_level": risk,
        "violations": violations,
        "recommendations": recs,
    }
