"""
Multi-Organ Diabetes Risk Assessment — FastAPI Backend
Clean, simple, functional. Models will be plugged in later.
"""

import os
import uuid
import json
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt

# ── Load env ─────────────────────────────────────────────────
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "multiorgan_diabetic")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Database (MongoDB with in-memory fallback) ───────────────
db = None

class MemoryCollection:
    """Simple in-memory replacement when MongoDB isn't available."""
    def __init__(self):
        self._docs = []

    async def insert_one(self, doc):
        self._docs.append(dict(doc))

    async def find_one(self, query, projection=None):
        for d in self._docs:
            if all(d.get(k) == v for k, v in query.items()):
                r = dict(d)
                if projection and projection.get("_id") == 0:
                    r.pop("_id", None)
                return r
        return None

    async def update_one(self, query, update, upsert=False):
        for i, d in enumerate(self._docs):
            if all(d.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    self._docs[i].update(update["$set"])
                return
        if upsert and "$set" in update:
            self._docs.append({**query, **update["$set"]})

    def find(self, query=None, projection=None):
        return MemoryCursor(self._docs, query or {}, projection)

    async def create_index(self, *a, **kw):
        pass

class MemoryCursor:
    def __init__(self, docs, query, projection):
        self._docs = [dict(d) for d in docs if all(d.get(k) == v for k, v in query.items())]
        if projection and projection.get("_id") == 0:
            for d in self._docs:
                d.pop("_id", None)

    def sort(self, key, direction=-1):
        self._docs.sort(key=lambda d: d.get(key, ""), reverse=(direction == -1))
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    async def to_list(self, length=100):
        return self._docs[:length]

class MemoryDB:
    def __init__(self):
        self._c = {}
    def __getattr__(self, name):
        if name.startswith("_"): return super().__getattribute__(name)
        if name not in self._c: self._c[name] = MemoryCollection()
        return self._c[name]


async def init_db():
    global db
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        await client.admin.command("ping")
        db = client[DB_NAME]
        await db.users.create_index("email", unique=True)
        await db.sessions.create_index("session_id", unique=True)
        await db.results.create_index("session_id", unique=True)
        logger.info("✅ MongoDB connected: %s", DB_NAME)
    except Exception as e:
        logger.warning("⚠️  MongoDB unavailable (%s) — using in-memory store", e)
        db = MemoryDB()


# ── Auth helpers ─────────────────────────────────────────────
security = HTTPBearer(auto_error=False)

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(days=1)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None

async def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(security)):
    if not creds:
        return None
    return decode_token(creds.credentials)


# ── File type detection (matches frontend logic) ────────────
def detect_file_type(filename: str) -> str:
    n = filename.lower()
    if any(k in n for k in ("retina", "fundus", "eye")): return "retina"
    if "tongue" in n: return "tongue"
    if any(k in n for k in ("foot", "skin")): return "foot"
    if any(k in n for k in ("blood", "cbc", "hba1c")): return "blood-report"
    if any(k in n for k in ("kidney", "renal")): return "kidney-report"
    if any(k in n for k in ("ecg", "ekg")): return "ecg"
    if n.endswith(".pdf"): return "blood-report"
    return "other"


# ── Mock analysis (placeholder until real models are added) ──
def mock_analysis(file_types: list[str], patient: dict) -> dict:
    """
    Generate realistic-looking results matching frontend data shape.
    Replace this function with real model inference later.
    """
    organs = []

    if "retina" in file_types:
        organs.append({
            "id": "retina", "name": "Retina", "icon": "Eye",
            "risk": "high", "score": 74, "confidence": 92,
            "hasImage": True,
            "findings": [
                "Mild non-proliferative diabetic retinopathy detected",
                "Microaneurysms present in superior temporal quadrant",
                "No macular edema observed",
            ],
            "abnormalValues": [],
            "explanation": "Image analysis identified early-stage retinopathy markers consistent with prolonged hyperglycemia. Annual ophthalmologic follow-up recommended.",
            "trend": [
                {"month": "Jan", "value": 45, "normal": 30},
                {"month": "Mar", "value": 55, "normal": 30},
                {"month": "Jun", "value": 62, "normal": 30},
                {"month": "Sep", "value": 70, "normal": 30},
                {"month": "Dec", "value": 74, "normal": 30},
            ],
        })

    if "kidney-report" in file_types:
        organs.append({
            "id": "kidney", "name": "Kidney", "icon": "Activity",
            "risk": "moderate", "score": 48, "confidence": 88,
            "hasImage": False,
            "findings": [
                "eGFR slightly reduced (68 mL/min/1.73m²)",
                "Microalbuminuria detected",
                "Serum creatinine within upper range",
            ],
            "abnormalValues": [
                {"name": "eGFR", "value": "68", "normal": "≥90 mL/min", "flag": True},
                {"name": "ACR", "value": "42", "normal": "<30 mg/g", "flag": True},
                {"name": "Creatinine", "value": "1.2", "normal": "0.7–1.3 mg/dL", "flag": False},
            ],
            "explanation": "Early signs of diabetic nephropathy. ACE inhibitor therapy and 6-month renal panel monitoring advised.",
            "trend": [
                {"month": "Jan", "value": 35, "normal": 25},
                {"month": "Mar", "value": 38, "normal": 25},
                {"month": "Jun", "value": 42, "normal": 25},
                {"month": "Sep", "value": 45, "normal": 25},
                {"month": "Dec", "value": 48, "normal": 25},
            ],
        })

    if any(t in file_types for t in ("ecg", "blood-report")):
        organs.append({
            "id": "heart", "name": "Heart", "icon": "Heart",
            "risk": "high", "score": 68, "confidence": 85,
            "hasImage": False,
            "findings": [
                "ECG: Mild ST-segment changes",
                "Elevated LDL cholesterol",
                "Resting heart rate elevated (88 bpm)",
            ],
            "abnormalValues": [
                {"name": "LDL", "value": "162", "normal": "<100 mg/dL", "flag": True},
                {"name": "HDL", "value": "38", "normal": ">40 mg/dL", "flag": True},
                {"name": "BP", "value": "142/92", "normal": "<130/80", "flag": True},
            ],
            "explanation": "Cardiovascular risk markers elevated. Cardiology consultation and lipid management recommended.",
            "trend": [],
        })

    if "foot" in file_types:
        organs.append({
            "id": "foot", "name": "Foot & Skin", "icon": "Footprints",
            "risk": "low", "score": 22, "confidence": 94,
            "hasImage": True,
            "findings": [
                "No visible ulceration or lesions",
                "Normal skin perfusion",
                "Recommend monthly self-examination",
            ],
            "abnormalValues": [],
            "explanation": "No concerning skin or peripheral findings. Maintain daily foot inspection routine.",
            "trend": [],
        })

    if "blood-report" in file_types:
        organs.append({
            "id": "blood", "name": "Blood Markers", "icon": "Droplet",
            "risk": "high", "score": 78, "confidence": 96,
            "hasImage": False,
            "findings": [
                "HbA1c elevated at 8.4%",
                "Fasting glucose 168 mg/dL",
                "Triglycerides borderline high",
            ],
            "abnormalValues": [
                {"name": "HbA1c", "value": "8.4%", "normal": "<7.0%", "flag": True},
                {"name": "Fasting Glucose", "value": "168", "normal": "70–110 mg/dL", "flag": True},
                {"name": "Triglycerides", "value": "188", "normal": "<150 mg/dL", "flag": True},
            ],
            "explanation": "Glycemic control is suboptimal. Consider medication adjustment and structured lifestyle intervention.",
            "trend": [
                {"month": "Jan", "value": 65, "normal": 50},
                {"month": "Mar", "value": 68, "normal": 50},
                {"month": "Jun", "value": 72, "normal": 50},
                {"month": "Sep", "value": 75, "normal": 50},
                {"month": "Dec", "value": 78, "normal": 50},
            ],
        })

    # If no specific types matched, add a default blood markers card
    if not organs:
        organs.append({
            "id": "blood", "name": "Blood Markers", "icon": "Droplet",
            "risk": "moderate", "score": 55, "confidence": 80,
            "hasImage": False,
            "findings": ["Assessment based on uploaded reports", "Further analysis recommended"],
            "abnormalValues": [], "explanation": "Preliminary assessment complete.", "trend": [],
        })

    # Compute overall
    scores = [o["score"] for o in organs]
    overall_score = round(sum(scores) / len(scores))
    if overall_score < 30: overall_risk = "low"
    elif overall_score < 60: overall_risk = "moderate"
    elif overall_score < 85: overall_risk = "high"
    else: overall_risk = "severe"

    return {
        "overallRisk": overall_risk,
        "overallScore": overall_score,
        "organs": organs,
        "recommendations": {
            "referrals": [
                {"specialist": "Endocrinologist", "urgency": "Within 2 weeks", "reason": "Glycemic control optimization"},
                {"specialist": "Ophthalmologist", "urgency": "Within 1 month", "reason": "Diabetic retinopathy follow-up"},
                {"specialist": "Cardiologist", "urgency": "Within 1 month", "reason": "Cardiovascular risk assessment"},
                {"specialist": "Nephrologist", "urgency": "Within 3 months", "reason": "Early nephropathy monitoring"},
            ],
            "lifestyle": [
                "Adopt a low-glycemic, Mediterranean-style diet",
                "150 minutes of moderate aerobic activity per week",
                "Reduce sodium intake to under 2,300 mg/day",
                "Maintain consistent sleep schedule (7–9 hours)",
                "Smoking cessation if applicable",
            ],
            "monitoring": [
                {"item": "Blood glucose", "frequency": "Daily, fasting & post-meal"},
                {"item": "Blood pressure", "frequency": "Twice weekly"},
                {"item": "HbA1c", "frequency": "Every 3 months"},
                {"item": "Lipid panel", "frequency": "Every 6 months"},
                {"item": "Renal panel", "frequency": "Every 6 months"},
            ],
            "timeline": [
                {"week": "Week 1", "action": "Schedule endocrinology consultation"},
                {"week": "Week 2", "action": "Begin daily glucose logging"},
                {"week": "Month 1", "action": "Ophthalmology and cardiology visits"},
                {"week": "Month 3", "action": "Repeat HbA1c and lipid panel"},
                {"week": "Month 6", "action": "Comprehensive risk re-assessment"},
            ],
        },
        "llm_summary": "",
    }


# ── App ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("🚀 API ready")
    yield
    logger.info("API shutdown")

app = FastAPI(title="Multi-Organ Diabetes Risk API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ════════════════════════════════════════════════════════════
#  ROUTES
# ════════════════════════════════════════════════════════════

# ── Health ───────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Auth ─────────────────────────────────────────────────────
@app.post("/api/auth/signup")
async def signup(body: dict):
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    name = body.get("name", "")
    role = body.get("role", "patient")

    if not email or not password or len(password) < 6:
        raise HTTPException(400, "Email and password (6+ chars) required")

    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists.")

    user_id = uuid.uuid4().hex[:16]
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id": user_id, "email": email, "name": name,
        "role": role, "hashed_password": hash_pw(password),
        "created_at": now,
    })

    token = create_token({"sub": user_id, "email": email, "name": name, "role": role, "created_at": now})
    return {
        "access_token": token, "token_type": "bearer",
        "user": {"id": user_id, "email": email, "name": name, "role": role, "createdAt": now},
    }


@app.post("/api/auth/login")
async def login(body: dict):
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    user = await db.users.find_one({"email": email})
    if not user or not check_pw(password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password.")

    token = create_token({
        "sub": user["id"], "email": user["email"],
        "name": user["name"], "role": user["role"],
        "created_at": user.get("created_at", ""),
    })
    return {
        "access_token": token, "token_type": "bearer",
        "user": {
            "id": user["id"], "email": user["email"],
            "name": user["name"], "role": user["role"],
            "createdAt": user.get("created_at", ""),
        },
    }


@app.post("/api/auth/demo")
async def demo_login():
    now = datetime.now(timezone.utc).isoformat()
    token = create_token({
        "sub": "demo-user", "email": "demo@clinic.health",
        "name": "Dr. Avery Chen", "role": "clinician", "created_at": now,
    })
    return {
        "access_token": token, "token_type": "bearer",
        "user": {
            "id": "demo-user", "email": "demo@clinic.health",
            "name": "Dr. Avery Chen", "role": "clinician", "createdAt": now,
        },
    }


@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    return {
        "id": user.get("sub", ""),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "patient"),
        "createdAt": user.get("created_at", ""),
    }


# ── Upload ───────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    patient_data: str = Form("{}"),
):
    if not files:
        raise HTTPException(422, "At least one file required")

    try:
        patient = json.loads(patient_data)
    except json.JSONDecodeError:
        raise HTTPException(422, "Invalid patient_data JSON")

    session_id = uuid.uuid4().hex[:16]
    session_dir = Path(UPLOAD_DIR) / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    saved_files = []
    for f in files:
        ext = Path(f.filename or "file").suffix.lower()
        if ext not in (".jpg", ".jpeg", ".png", ".pdf"):
            raise HTTPException(422, f"Unsupported file type: {ext}")

        content = await f.read()
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(413, "File exceeds 20MB limit")

        safe_name = f"{uuid.uuid4().hex[:8]}_{f.filename}"
        dest = session_dir / safe_name
        dest.write_bytes(content)

        saved_files.append({
            "file_type": detect_file_type(f.filename or ""),
            "original_filename": f.filename,
            "stored_path": str(dest),
            "size_bytes": len(content),
        })

    await db.sessions.insert_one({
        "session_id": session_id,
        "patient": patient,
        "files": saved_files,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "uploaded",
    })

    logger.info("Session %s: %d files uploaded", session_id, len(saved_files))
    return {
        "session_id": session_id,
        "files": saved_files,
        "message": f"Uploaded {len(saved_files)} file(s)",
    }


# ── Analyze (SSE stream) ────────────────────────────────────
@app.post("/api/analyze")
async def analyze(body: dict):
    session_id = body.get("session_id", "")
    session = await db.sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")

    file_types = list({f["file_type"] for f in session.get("files", [])})
    patient = session.get("patient", {})

    async def stream():
        steps = [
            ("classifying", "Classifying uploaded files"),
            ("retina", "Analyzing retina image"),
            ("blood", "Extracting blood report"),
            ("kidney", "Evaluating kidney function"),
            ("heart", "Assessing cardiovascular markers"),
            ("foot", "Reviewing foot & skin imagery"),
            ("risk_scoring", "Computing overall risk profile"),
        ]
        for step_id, label in steps:
            yield f"data: {json.dumps({'step': step_id, 'status': 'processing', 'label': label})}\n\n"
            await asyncio.sleep(0.8)  # simulate processing time
            yield f"data: {json.dumps({'step': step_id, 'status': 'complete'})}\n\n"

        # Generate results
        results = mock_analysis(file_types, patient)
        results["session_id"] = session_id
        results["metadata"] = {
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": session_id,
        }

        # Store in DB
        await db.results.update_one(
            {"session_id": session_id},
            {"$set": results},
            upsert=True,
        )

        yield f"data: {json.dumps({'step': 'complete', 'status': 'complete', 'session_id': session_id})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


# ── Results ──────────────────────────────────────────────────
@app.get("/api/results/{session_id}")
async def get_results(session_id: str):
    result = await db.results.find_one({"session_id": session_id}, {"_id": 0})
    if not result:
        raise HTTPException(404, "Results not found")
    return result


@app.get("/api/results")
async def list_results(limit: int = 20):
    cursor = db.results.find({}, {"_id": 0}).sort("metadata.analysis_timestamp", -1).limit(limit)
    results = await cursor.to_list(length=limit)
    return {"results": results, "count": len(results)}


# ── Export PDF ───────────────────────────────────────────────
@app.post("/api/export-report")
async def export_report(body: dict):
    session_id = body.get("session_id", "")
    result = await db.results.find_one({"session_id": session_id}, {"_id": 0})
    if not result:
        raise HTTPException(404, "Results not found")

    from app.pdf_report import generate_pdf
    pdf_bytes = generate_pdf(result)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{session_id}.pdf"'},
    )
