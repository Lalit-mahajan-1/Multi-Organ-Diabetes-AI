from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.api.routes.auth import get_current_user
from app.core.database import db_manager

router = APIRouter()
MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "kidney_ckd_model.joblib"
FEATURES_PATH = Path(__file__).resolve().parents[2] / "models" / "kidney_ckd_feature_list.joblib"


class KidneyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: float | None = Field(default=None, ge=0, le=110)
    bp: float | None = Field(default=None, ge=40, le=200)
    sg: float | None = Field(default=None, ge=1.0, le=1.04)
    al: float | None = Field(default=None, ge=0, le=5)
    su: float | None = Field(default=None, ge=0, le=5)
    rbc: str | None = None
    pc: str | None = None
    pcc: str | None = None
    ba: str | None = None
    bgr: float | None = Field(default=None, ge=20, le=700)
    bu: float | None = Field(default=None, ge=1, le=300)
    sc: float | None = Field(default=None, ge=0.1, le=40)
    sod: float | None = Field(default=None, ge=100, le=180)
    pot: float | None = Field(default=None, ge=1.5, le=9)
    hemo: float | None = Field(default=None, ge=2, le=20)
    pcv: float | None = Field(default=None, ge=5, le=60)
    wc: float | None = Field(default=None, ge=100, le=30000)
    rc: float | None = Field(default=None, ge=1, le=10)
    htn: str | None = None
    dm: str | None = None
    cad: str | None = None
    appet: str | None = None
    pe: str | None = None
    ane: str | None = None


@lru_cache(maxsize=1)
def load_model() -> tuple[Any, list[str]]:
    if not MODEL_PATH.exists() or not FEATURES_PATH.exists():
        raise FileNotFoundError("CKD model artifacts are missing; train the kidney model first")
    return joblib.load(MODEL_PATH), joblib.load(FEATURES_PATH)


def risk_level(probability: float) -> str:
    if probability < 0.25:
        return "LOW"
    if probability < 0.5:
        return "MODERATE"
    if probability < 0.75:
        return "HIGH"
    return "VERY HIGH"


@router.post("/kidney/analyze")
async def analyze_kidney(
    payload: KidneyInput,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        model, feature_cols = load_model()
        values = payload.model_dump()
        frame = pd.DataFrame([{column: values.get(column) for column in feature_cols}])
        probability = float(model.predict_proba(frame)[0, 1])
        level = risk_level(probability)
        response = {
            "model_name": "KidneyCKDRandomForest",
            "model_description": "Notebook-trained, calibrated CKD screening model",
            "prediction": "CKD risk signal" if probability >= 0.5 else "No CKD risk signal",
            "probability": round(probability, 4),
            "risk_score": round(probability * 100, 2),
            "risk_level": level,
            "confidence": round(max(probability, 1 - probability), 4),
            "findings": [
                f"Estimated CKD screening probability: {probability:.1%}",
                "This result is a screening signal and not a medical diagnosis.",
            ],
        }
        db = db_manager.get_db()
        if db is not None:
            result = await db.kidney_analyses.insert_one({
                **response,
                "analysis_type": "kidney",
                "user_id": user.get("sub", ""),
                "inputs": values,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            response["analysis_id"] = str(result.inserted_id)
            response["stored"] = True
        else:
            response["stored"] = False
        return response
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Kidney analysis failed: {exc}") from exc
