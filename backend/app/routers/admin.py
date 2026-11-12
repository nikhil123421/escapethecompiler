"""Organizer console endpoints. Everything here requires an organizer token."""

from fastapi import APIRouter, Depends

from app.clock import utcnow
from app.deps import get_repository, require_organizer
from app.errors import ApiError
from app.models import Event, Team
from app.repository import Repository
from app.schemas import (
    OkResponse,
    SubmissionOut,
    TeamCreate,
    TeamSummary,
    TeamUpdate,
)
from app.services import standings

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_organizer)],
)


def _active_event(repo: Repository) -> Event:
    event = repo.get_active_event()
    if event is None:
        raise ApiError("no_event", "No active event.", status=404)
    return event


def _reset_team(repo: Repository, team: Team) -> Team:
    repo.delete_progress(team.id)
    team.started_at = None
    team.finished_at = None
    team.escaped = False
    team.status = "racing"
    team.final_attempts = 0
    repo.save_team(team)
    return team


@router.get("/teams", response_model=list[TeamSummary])
def list_teams(repo: Repository = Depends(get_repository)) -> list[TeamSummary]:
    event = _active_event(repo)
    now = utcnow()
    progress_by_team: dict[str, list] = {}
    for progress in repo.list_progress_for_event(event.id):
        progress_by_team.setdefault(progress.team_id, []).append(progress)

    return [
        standings.summary_for(team, progress_by_team.get(team.id, []), event, now)
        for team in repo.list_teams(event.id)
    ]


@router.post("/teams", response_model=TeamSummary)
def create_team(
    body: TeamCreate, repo: Repository = Depends(get_repository)
) -> TeamSummary:
    event = _active_event(repo)
    code = body.code.strip().upper()

    if repo.find_team(event.id, code) is not None:
        raise ApiError("team_exists", f"Team {code} already exists.", status=409)

    team = repo.create_team(event.id, code, body.name.strip(), body.members)
    return standings.summary_for(team, [], event, utcnow())


@router.patch("/teams/{team_id}", response_model=TeamSummary)
def update_team(
    team_id: str, body: TeamUpdate, repo: Repository = Depends(get_repository)
) -> TeamSummary:
    team = repo.get_team(team_id)
    if team is None:
        raise ApiError("not_found", "That team does not exist.", status=404)

    if body.name is not None:
        team.name = body.name.strip()
    if body.members is not None:
        team.members = [member.strip()[:40] for member in body.members if member.strip()][:10]
    if body.status is not None:
        team.status = body.status

    repo.save_team(team)
    event = _active_event(repo)
    return standings.summary_for(
        team, repo.list_progress(team.id), event, utcnow()
    )


@router.post("/teams/{team_id}/reset", response_model=TeamSummary)
def reset_team(
    team_id: str, repo: Repository = Depends(get_repository)
) -> TeamSummary:
    team = repo.get_team(team_id)
    if team is None:
        raise ApiError("not_found", "That team does not exist.", status=404)

    team = _reset_team(repo, team)
    event = _active_event(repo)
    return standings.summary_for(team, [], event, utcnow())


@router.delete("/teams/{team_id}", response_model=OkResponse)
def delete_team(
    team_id: str, repo: Repository = Depends(get_repository)
) -> OkResponse:
    team = repo.get_team(team_id)
    if team is None:
        raise ApiError("not_found", "That team does not exist.", status=404)

    repo.delete_team(team_id)
    return OkResponse()


@router.post("/event/reset", response_model=OkResponse)
def reset_event(repo: Repository = Depends(get_repository)) -> OkResponse:
    event = _active_event(repo)
    for team in repo.list_teams(event.id):
        _reset_team(repo, team)
    return OkResponse()


@router.get("/submissions", response_model=list[SubmissionOut])
def submissions(
    limit: int = 50, repo: Repository = Depends(get_repository)
) -> list[SubmissionOut]:
    limit = max(1, min(limit, 200))
    event = _active_event(repo)
    teams = {team.id: team for team in repo.list_teams(event.id)}

    rows = []
    for submission in repo.list_submissions(limit=limit * 5):
        team = teams.get(submission.team_id)
        if team is None:
            continue
        rows.append(
            SubmissionOut(
                id=submission.id,
                team_id=submission.team_id,
                team_name=team.name,
                room_id=submission.room_id,
                passed=submission.passed,
                tests_passed=submission.tests_passed,
                tests_total=submission.tests_total,
                error=submission.error,
                language=getattr(submission, "language", "javascript"),
                created_at=submission.created_at,
            )
        )
        if len(rows) >= limit:
            break

    return rows
