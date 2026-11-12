"""FastAPI Dependencies.

For beginner developers:
FastAPI's dependency injection system (Depends) allows functions to automatically
receive shared resources (like the database or authenticated user).

Example:
    @router.get("/profile")
    def get_profile(team: Team = Depends(get_current_team)):
        return team
FastAPI will automatically:
1. Extract the 'Authorization: Bearer <token>' header.
2. Decode and verify the JWT token.
3. Look up the Team in the database.
4. Pass the Team object into your function!
"""

from functools import lru_cache
from fastapi import Depends, Header

from app.config import get_settings
from app.errors import ApiError
from app.models import Team
from app.repository import Repository, create_repository
from app.security import decode_token


@lru_cache
def get_repository() -> Repository:
    """Provides a single database repository instance across the entire application."""
    return create_repository(get_settings())


def _bearer_token(authorization: str | None = Header(default=None)) -> str:
    """Reads and validates the Bearer token from the HTTP Authorization header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError("not_authenticated", "Please log in to continue.", status=401)
    return authorization.split(" ", 1)[1].strip()


def get_current_team(
    token: str = Depends(_bearer_token),
    repo: Repository = Depends(get_repository),
) -> Team:
    """Validates the team's JWT token and returns the current Team model."""
    payload = decode_token(token)
    if payload.get("role") != "team":
        raise ApiError("not_authenticated", "This token does not belong to a team session.", status=401)

    team = repo.get_team(payload.get("sub", ""))
    if team is None:
        raise ApiError("not_authenticated", "This team does not exist or was deleted.", status=401)
    return team


def require_organizer(token: str = Depends(_bearer_token)) -> None:
    """Security check ensuring the request comes from an authenticated event organizer."""
    payload = decode_token(token)
    if payload.get("role") != "organizer":
        raise ApiError("forbidden", "Organizer privileges required for this action.", status=403)
