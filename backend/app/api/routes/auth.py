from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone
import uuid
import os

from app.core.database import db_manager
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter()

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days
IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"


# -----------------------------
# Schemas
# -----------------------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = ""
    role: str = "patient"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# -----------------------------
# Helpers
# -----------------------------

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def delete_auth_cookie(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",
    )


async def get_current_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


def clean_user_response(user: dict):
    return {
        "id": user.get("id", user.get("sub", "")),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "patient"),
        "createdAt": user.get("created_at", ""),
    }


# -----------------------------
# Routes
# -----------------------------

@router.post("/signup")
async def signup(body: SignupRequest, response: Response):
    email = body.email.strip().lower()
    name = body.name.strip()
    role = body.role.strip().lower() or "patient"

    if role not in ["patient", "clinician", "doctor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    db = db_manager.get_db()

    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    existing_user = await db.users.find_one({"email": email})

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "hashed_password": hash_password(body.password),
        "created_at": now,
    }

    await db.users.insert_one(user_doc)

    token_payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role,
        "created_at": now,
    }

    token = create_access_token(token_payload)

    set_auth_cookie(response, token)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": clean_user_response(user_doc),
    }


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.strip().lower()

    db = db_manager.get_db()

    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = await db.users.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    hashed_password = user.get("hashed_password")

    if not hashed_password or not verify_password(body.password, hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token_payload = {
        "sub": user.get("id", ""),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "patient"),
        "created_at": user.get("created_at", ""),
    }

    token = create_access_token(token_payload)

    set_auth_cookie(response, token)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": clean_user_response(user),
    }


@router.post("/demo")
async def demo_login(response: Response):
    now = datetime.now(timezone.utc).isoformat()

    demo_user = {
        "id": "demo-user",
        "email": "demo@clinic.health",
        "name": "Dr. Avery Chen",
        "role": "clinician",
        "created_at": now,
    }

    token_payload = {
        "sub": demo_user["id"],
        "email": demo_user["email"],
        "name": demo_user["name"],
        "role": demo_user["role"],
        "created_at": demo_user["created_at"],
    }

    token = create_access_token(token_payload)

    set_auth_cookie(response, token)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": clean_user_response(demo_user),
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user.get("sub", ""),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "patient"),
        "createdAt": user.get("created_at", ""),
    }


@router.post("/logout")
async def logout(response: Response):
    delete_auth_cookie(response)

    return {
        "message": "Logged out successfully"
    }