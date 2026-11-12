"""Public team directory. Also no login, also projector-safe."""

from fastapi import APIRouter, Depends

from app.clock import utcnow
from app.deps import get_repository
from app.errors import ApiError
from app.repository import Repository
from app.schemas import TeamDetail, TeamSummary
from app.services import standings

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=list[TeamSummary])
def list_teams(repo: Repository = Depends(get_repository)) -> list[TeamSummary]:
    event = repo.get_active_event()
    if event is None:
        return []

    now = utcnow()
    progress_by_team: dict[str, list] = {}
    for progress in repo.list_progress_for_event(event.id):
        progress_by_team.setdefault(progress.team_id, []).append(progress)

    return [
        standings.summary_for(team, progress_by_team.get(team.id, []), event, now)
        for team in repo.list_teams(event.id)
    ]


@router.get("/{team_id}", response_model=TeamDetail)
def team_detail(
    team_id: str, repo: Repository = Depends(get_repository)
) -> TeamDetail:
    team = repo.get_team(team_id)
    if team is None:
        raise ApiError("not_found", "That team does not exist.", status=404)

    event = repo.get_event(team.event_id)
    if event is None:
        raise ApiError("not_found", "That event does not exist.", status=404)

    summary = standings.summary_for(
        team, repo.list_progress(team.id), event, utcnow()
    )
    return TeamDetail(
        **summary.model_dump(),
        started_at=team.started_at,
        finished_at=team.finished_at,
        submissions=repo.count_submissions_for_team(team.id),
    )
