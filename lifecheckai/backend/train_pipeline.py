import os
import json
import pickle
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, ConfusionMatrixDisplay, f1_score
)
from sklearn.ensemble import RandomForestClassifier
try:
    from xgboost import XGBClassifier
except ImportError:
    # Need to install xgboost
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "xgboost"])
    from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

# ── Create output directories ────────────────────────────────────────────────
os.makedirs("model",   exist_ok=True)
os.makedirs("outputs", exist_ok=True)

DATA_DIR = "app/data" # Adjusted for FastApi structure if needed
if not os.path.exists(DATA_DIR):
    DATA_DIR = "../data"
if not os.path.exists(DATA_DIR):
    DATA_DIR = "data"

YEARS    = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2024]
frames = []
for yr in YEARS:
    fp = os.path.join(DATA_DIR, f"water_quality_clean_{yr}.csv")
    if not os.path.exists(fp):
        continue
    df_yr = pd.read_csv(fp, low_memory=False)
    frames.append(df_yr)

df = pd.concat(frames, ignore_index=True)
df.drop_duplicates(inplace=True)

BIS_VIOLATION_COLS = [
    "TDS_Exceeds_BIS",
    "pH_Exceeds_BIS",
    "Fluoride_Exceeds_BIS",
    "Arsenic_Exceeds_BIS",
    "NitrateN_NitriteN_Exceeds_BIS",
]

for col in BIS_VIOLATION_COLS:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

available_flags = [c for c in BIS_VIOLATION_COLS if c in df.columns]
df["any_violation"] = df[available_flags].max(axis=1)          
df["is_drinkable"]  = (df["any_violation"] == 0).astype(int)   

df.dropna(subset=["any_violation"], inplace=True)

df["violation_reason"] = df[available_flags].apply(
    lambda row: ", ".join([
        col.replace("_Exceeds_BIS","").replace("NitrateN_NitriteN","Nitrate")
        for col in available_flags if row[col] == 1
    ]) if row.max() == 1 else "None",
    axis=1
)

FEATURE_COLS = [
    "Temp_Min_C", "Temp_Max_C", "Temp_Mean",
    "pH_Min", "pH_Max", "pH_Mean",
    "Conductivity_Min", "Conductivity_Max", "Conductivity_Mean",
    "BOD_Min", "BOD_Max", "BOD_Mean",
    "NitrateN_NitriteN_Min", "NitrateN_NitriteN_Max", "NitrateN_NitriteN_Mean",
    "Fecal_Coliform_Min", "Fecal_Coliform_Max", "Fecal_Coliform_Mean",
    "Total_Coliform_Min", "Total_Coliform_Max", "Total_Coliform_Mean",
    "TDS_Min", "TDS_Max", "TDS_Mean",
    "Fluoride_Min", "Fluoride_Max", "Fluoride_Mean",
    "Arsenic_Min", "Arsenic_Max", "Arsenic_Mean",
    "Year",
]

for col in FEATURE_COLS:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Range features
df["Temp_Range"]         = df["Temp_Max_C"]             - df["Temp_Min_C"]
df["pH_Range"]           = df["pH_Max"]                 - df["pH_Min"]
df["Conductivity_Range"] = df["Conductivity_Max"]       - df["Conductivity_Min"]
df["BOD_Range"]          = df["BOD_Max"]                - df["BOD_Min"]
df["TDS_Range"]          = df["TDS_Max"]                - df["TDS_Min"]
df["Fluoride_Range"]     = df["Fluoride_Max"]           - df["Fluoride_Min"]
df["Arsenic_Range"]      = df["Arsenic_Max"]            - df["Arsenic_Min"]
df["Nitrate_Range"]      = df["NitrateN_NitriteN_Max"]  - df["NitrateN_NitriteN_Min"]

# Ratios
df["TDS_Conductivity_Ratio"] = df["TDS_Mean"] / (df["Conductivity_Mean"] + 1e-6)
df["BOD_Nitrate_Ratio"]      = df["BOD_Mean"] / (df["NitrateN_NitriteN_Mean"] + 1e-6)
df["Fecal_Total_Ratio"]      = df["Fecal_Coliform_Mean"] / (df["Total_Coliform_Mean"] + 1e-6)

# BIS threshold flags
df["pH_Deviation"]   = (df["pH_Mean"] - 7.0).abs()
df["High_TDS"]       = (df["TDS_Mean"]              > 500).astype(int)
df["High_Fluoride"]  = (df["Fluoride_Mean"]         > 1.0).astype(int)
df["High_Arsenic"]   = (df["Arsenic_Mean"]          > 0.01).astype(int)
df["High_Nitrate"]   = (df["NitrateN_NitriteN_Mean"]> 45).astype(int)
df["Acidic_pH"]      = (df["pH_Mean"]               < 6.5).astype(int)
df["Basic_pH"]       = (df["pH_Mean"]               > 8.5).astype(int)
df["High_BOD"]       = (df["BOD_Mean"]              > 3.0).astype(int)
df["High_Fecal"]     = (df["Fecal_Coliform_Mean"]   > 10).astype(int)

# State encoding
le_state = LabelEncoder()
df["State_Enc"] = le_state.fit_transform(df["State"].fillna("Unknown").astype(str))

ENGINEERED = [
    "Temp_Range", "pH_Range", "Conductivity_Range", "BOD_Range",
    "TDS_Range", "Fluoride_Range", "Arsenic_Range", "Nitrate_Range",
    "TDS_Conductivity_Ratio", "BOD_Nitrate_Ratio", "Fecal_Total_Ratio",
    "pH_Deviation", "High_TDS", "High_Fluoride", "High_Arsenic",
    "High_Nitrate", "Acidic_pH", "Basic_pH", "High_BOD", "High_Fecal",
    "State_Enc",
]

ALL_FEATURES = [c for c in FEATURE_COLS + ENGINEERED if c in df.columns]

model_data = df[ALL_FEATURES + ["is_drinkable"]].dropna(subset=["is_drinkable"])
X = model_data[ALL_FEATURES]
y = model_data["is_drinkable"].astype(int)

preprocessor = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler",  StandardScaler()),
])
X_proc = preprocessor.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_proc, y, test_size=0.2, stratify=y, random_state=42
)

best_model = XGBClassifier(
    n_estimators=300, max_depth=6, learning_rate=0.05,
    scale_pos_weight=(y==0).sum()/(y==1).sum(),
    eval_metric="logloss", random_state=42, n_jobs=-1
)

best_model.fit(X_train, y_train)

pickle.dump(best_model,    open("model/water_quality_model.pkl",  "wb"))
pickle.dump(preprocessor,  open("model/preprocessor.pkl",         "wb"))
pickle.dump(le_state,      open("model/label_encoder.pkl",        "wb"))
pickle.dump(ALL_FEATURES,  open("model/feature_names.pkl",        "wb"))
print("Saved models successfully")
