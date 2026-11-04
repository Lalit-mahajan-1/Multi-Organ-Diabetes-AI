from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

RANDOM_STATE = 42
ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "app" / "data" / "kidney_disease.csv"
MODEL_DIR = ROOT / "app" / "models"

NUMERIC_COLS = ["age", "bp", "sg", "al", "su", "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc"]
CATEGORICAL_COLS = ["rbc", "pc", "pcc", "ba", "htn", "dm", "cad", "appet", "pe", "ane"]
FEATURE_COLS = NUMERIC_COLS + CATEGORICAL_COLS
REFERENCE_RANGES = {
    "age": (0, 110), "bp": (40, 200), "bgr": (20, 700), "bu": (1, 300),
    "sc": (0.1, 40), "sod": (100, 180), "pot": (1.5, 9.0), "hemo": (2, 20),
    "pcv": (5, 60),
}


def clean_data(frame: pd.DataFrame) -> pd.DataFrame:
    out = frame.copy()
    numeric_text_cols = ["wc", "rc", "pcv"]
    categorical_cols = CATEGORICAL_COLS + ["classification"]
    for column in out.columns:
        if out[column].dtype == object:
            out[column] = out[column].astype(str).str.strip().replace({"nan": np.nan, "?": np.nan, "": np.nan})
    for column in numeric_text_cols:
        out[column] = pd.to_numeric(out[column], errors="coerce")
    for column in categorical_cols:
        out[column] = out[column].str.lower()
    for column, (lower, upper) in REFERENCE_RANGES.items():
        invalid = (out[column] < lower) | (out[column] > upper)
        out.loc[invalid, column] = np.nan
    out["target"] = (out["classification"] == "ckd").astype(int)
    return out


def make_preprocessor() -> ColumnTransformer:
    numeric = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([
        ("num", numeric, NUMERIC_COLS),
        ("cat", categorical, CATEGORICAL_COLS),
    ])


def train() -> None:
    frame = clean_data(pd.read_csv(DATA_PATH))
    x = frame[FEATURE_COLS]
    y = frame["target"]
    x_train, x_temp, y_train, y_temp = train_test_split(
        x, y, test_size=0.30, stratify=y, random_state=RANDOM_STATE
    )
    x_val, _, y_val, _ = train_test_split(
        x_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=RANDOM_STATE
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    candidates: dict[str, RandomizedSearchCV] = {}

    logreg = Pipeline([
        ("pre", make_preprocessor()),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE)),
    ])
    candidates["LogisticRegression"] = RandomizedSearchCV(
        logreg, {"clf__C": np.logspace(-2, 2, 20)}, n_iter=10,
        scoring="roc_auc", cv=cv, random_state=RANDOM_STATE, n_jobs=-1,
    )
    forest = Pipeline([
        ("pre", make_preprocessor()),
        ("clf", RandomForestClassifier(class_weight="balanced", random_state=RANDOM_STATE)),
    ])
    candidates["RandomForest"] = RandomizedSearchCV(
        forest,
        {"clf__n_estimators": [200, 400, 600], "clf__max_depth": [3, 5, 8, None],
         "clf__min_samples_leaf": [1, 2, 4]},
        n_iter=12, scoring="roc_auc", cv=cv, random_state=RANDOM_STATE, n_jobs=-1,
    )
    gradient = Pipeline([
        ("pre", make_preprocessor()),
        ("clf", HistGradientBoostingClassifier(random_state=RANDOM_STATE)),
    ])
    candidates["HistGradientBoosting"] = RandomizedSearchCV(
        gradient,
        {"clf__max_iter": [100, 200, 300], "clf__max_depth": [2, 3, 4, 5],
         "clf__learning_rate": [0.01, 0.05, 0.1, 0.2]},
        n_iter=12, scoring="roc_auc", cv=cv, random_state=RANDOM_STATE, n_jobs=-1,
    )
    for model in candidates.values():
        model.fit(x_train, y_train)
    best_name = max(candidates, key=lambda name: candidates[name].best_score_)
    calibrated = CalibratedClassifierCV(FrozenEstimator(candidates[best_name].best_estimator_), method="sigmoid")
    calibrated.fit(x_val, y_val)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated, MODEL_DIR / "kidney_ckd_model.joblib")
    joblib.dump(FEATURE_COLS, MODEL_DIR / "kidney_ckd_feature_list.joblib")
    joblib.dump({"ckd": 1, "notckd": 0}, MODEL_DIR / "kidney_ckd_label_mapping.joblib")
    (MODEL_DIR / "kidney_ckd_metadata.json").write_text(json.dumps({
        "model_name": best_name,
        "features": FEATURE_COLS,
        "target": "classification: ckd=1, notckd=0",
    }, indent=2))
    print(f"Saved {best_name} CKD model to {MODEL_DIR}")


if __name__ == "__main__":
    train()
