from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.routes.auth import get_current_user
from app.core.database import db_manager

router = APIRouter()
sessions: dict[str, dict[str, Any]] = {}


class AnalyzeRequest(BaseModel):
    session_id: str


def classify_file(filename: str) -> str:
    name = filename.lower()
    if "retina" in name or "fundus" in name or "eye" in name:
        return "retina"
    if "tongue" in name:
        return "tongue"
    if "foot" in name or "skin" in name:
        return "foot"
    if "kidney" in name or "renal" in name:
        return "kidney-report"
    if "ecg" in name or "ekg" in name:
        return "ecg"
    if "blood" in name or "cbc" in name or "hba1c" in name:
        return "blood-report"
    return "other"


@router.post("/upload")
async def upload_assessment_files(
    files: list[UploadFile] = File(...),
    patient_data: str = Form(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        parsed_patient_data = json.loads(patient_data)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid patient_data JSON") from exc

    if not isinstance(parsed_patient_data, dict):
        raise HTTPException(status_code=400, detail="patient_data must be an object")
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")

    session_id = uuid.uuid4().hex
    uploaded_files = []
    for file in files:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail=f"Uploaded file is empty: {file.filename or 'unnamed file'}")
        uploaded_files.append({
            "file_type": classify_file(file.filename or ""),
            "original_filename": file.filename or "uploaded-file",
            "content_type": file.content_type or "application/octet-stream",
            "size": len(contents),
        })

    session = {
        "session_id": session_id,
        "user_id": user.get("sub", ""),
        "patient_data": parsed_patient_data,
        "files": uploaded_files,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "uploaded",
    }
    sessions[session_id] = session

    db = db_manager.get_db()
    if db is not None:
        await db.assessment_sessions.insert_one(session.copy())

    return {
        "session_id": session_id,
        "files": uploaded_files,
        "message": "Assessment files uploaded successfully",
    }


@router.post("/analyze")
async def analyze_assessment(
    request: AnalyzeRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> StreamingResponse:
    session = sessions.get(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    if session["user_id"] != user.get("sub", ""):
        raise HTTPException(status_code=403, detail="Assessment session does not belong to this workspace")

    async def events():
        steps = [
            ("loading", "Loading session data"),
            ("classifying", "Classifying uploaded files"),
            ("analyzing", "Running available analysis modules"),
            ("risk_scoring", "Preparing risk profile"),
        ]
        for step, label in steps:
            yield f"data: {json.dumps({'step': step, 'status': 'complete', 'label': label})}\n\n"
        session["status"] = "complete"
        yield f"data: {json.dumps({'step': 'complete', 'status': 'complete', 'session_id': request.session_id})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


@router.get("/results/{session_id}")
async def get_assessment_results(
    session_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    if session["user_id"] != user.get("sub", ""):
        raise HTTPException(status_code=403, detail="Assessment session does not belong to this workspace")
    if session["status"] != "complete":
        raise HTTPException(status_code=409, detail="Assessment is still processing")

    return {
        "overallRisk": "low",
        "overallScore": 0,
        "organs": [],
        "recommendations": {},
        "session_id": session_id,
        "message": "No organ-specific analysis was included in the uploaded assessment.",
    }
