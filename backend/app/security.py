"""Passcodes and session tokens.

Two small jobs:
  * hash and check the shared event passcode (bcrypt, so a database leak
    does not hand out free entry);
  * sign and read the JWT the frontend sends as `Authorization: Bearer ...`.

The token holds no sensitive data — just who you are and which event.
"""

import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import get_settings
from app.errors import ApiError

ALGORITHM = "HS256"


def hash_passcode(passcode: str) -> str:
    return bcrypt.hashpw(passcode.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_passcode(passcode: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(passcode.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def check_organizer_passcode(passcode: str) -> bool:
    return secrets.compare_digest(passcode, get_settings().organizer_passcode)


def create_token(subject: str, role: str, event_id: str | None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "event_id": event_id,
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_ttl_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise ApiError("session_expired", "Your session expired. Log in again.", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise ApiError("not_authenticated", "Invalid session. Log in again.", 401) from exc
