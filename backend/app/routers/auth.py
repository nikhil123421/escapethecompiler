"""Login: a team code plus the shared event passcode becomes a JWT."""

from fastapi import APIRouter, Depends

from app.clock import utcnow
from app.deps import get_current_team, get_repository
from app.errors import ApiError
from app.models import Team
from app.repository import Repository
from app.schemas import (
    AuthResponse,
    LoginRequest,
    OrganizerAuthResponse,
    OrganizerLoginRequest,
    TeamOut,
)
from app.security import check_organizer_passcode, create_token, hash_passcode, verify_passcode
from app.services import scoring

router = APIRouter(prefix="/api/auth", tags=["auth"])


def team_out(repo: Repository, team: Team) -> TeamOut:
    event = repo.get_event(team.event_id)
    room_seconds = event.room_seconds if event else 15 * 60
    score = scoring.score_for(repo.list_progress(team.id), team.escaped, room_seconds)
    return TeamOut(
        id=team.id,
        code=team.code,
        name=team.name,
        members=team.members,
        status=team.status,
        score=score.total,
        started_at=team.started_at,
        finished_at=team.finished_at,
        escaped=team.escaped,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, repo: Repository = Depends(get_repository)) -> AuthResponse:
    event = repo.get_active_event()
    if event is None:
        raise ApiError("no_event", "No event is running right now.", status=503)

    code = body.team_code.strip().upper()
    name = " ".join(body.team_name.split())
    pin = body.pin.strip()
    team = repo.find_team(event.id, code)

    if team is not None:
        # Returning team login: check name if provided, or verify PIN
        if name and team.name.strip().lower() != name.lower():
            raise ApiError(
                "name_taken",
                f"Team {code} is registered under the name '{team.name}'.",
                status=409,
            )
        # Check team secret PIN if configured
        if team.pin_hash:
            if not pin:
                raise ApiError(
                    "pin_required",
                    f"Team {code} is protected by a team PIN. Please enter your team PIN.",
                    status=401,
                )
            if not verify_passcode(pin, team.pin_hash):
                raise ApiError(
                    "bad_pin",
                    "Incorrect team PIN.",
                    status=401,
                )
        elif pin:
            # Set PIN if it wasn't previously set
            team.pin_hash = hash_passcode(pin)

        new_members = [member.strip()[:40] for member in body.members if member.strip()][:4]
        if new_members:
            team.members = new_members
        if team.started_at is None:
            team.started_at = utcnow()
        repo.save_team(team)
    else:
        # Creating a brand new team
        if not name:
            raise ApiError("name_required", "Please enter a team name to register.", status=422)
        members = [member.strip()[:40] for member in body.members if member.strip()][:4]
        pin_hash = hash_passcode(pin) if pin else None
        team = repo.create_team(event.id, code, name, members, pin_hash=pin_hash)
        team.started_at = utcnow()
        repo.save_team(team)

    token = create_token(team.id, "team", event.id)
    return AuthResponse(token=token, team=team_out(repo, team))


@router.post("/organizer", response_model=OrganizerAuthResponse)
def organizer_login(body: OrganizerLoginRequest) -> OrganizerAuthResponse:
    if not check_organizer_passcode(body.passcode):
        raise ApiError("bad_passcode", "Wrong organizer passcode.", status=401)
    token = create_token("organizer", "organizer", None)
    return OrganizerAuthResponse(token=token)


@router.get("/me", response_model=TeamOut)
def me(
    team: Team = Depends(get_current_team),
    repo: Repository = Depends(get_repository),
) -> TeamOut:
    return team_out(repo, team)
