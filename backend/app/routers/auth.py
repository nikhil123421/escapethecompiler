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
from app.security import check_organizer_passcode, create_token, verify_passcode
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

    if not verify_passcode(body.passcode.strip(), event.passcode_hash):
        raise ApiError("bad_passcode", "Wrong event passcode.", status=401)

    code = body.team_code.strip().upper()
    name = " ".join(body.team_name.split())
    team = repo.find_team(event.id, code)

    if team is not None:
        # Anyone with the passcode could type someone else's code. Requiring the
        # same team name keeps casual impersonation out without locking a team
        # to one laptop: all teammates share the name.
        if team.name.strip().lower() != name.lower():
            raise ApiError(
                "name_taken",
                f"Team {code} already belongs to a different team name.",
                status=409,
            )
        new_members = [member.strip()[:40] for member in body.members if member.strip()][:10]
        if new_members:
            team.members = new_members
        if team.started_at is None:
            team.started_at = utcnow()
        repo.save_team(team)
    else:
        members = [member.strip()[:40] for member in body.members if member.strip()][:10]
        team = repo.create_team(event.id, code, name, members)
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
