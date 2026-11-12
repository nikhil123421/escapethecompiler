"""The public leaderboard: no login, safe to put on a projector."""

from fastapi import APIRouter, Depends

from app.clock import utcnow
from app.deps import get_repository
from app.models import Progress
from app.repository import Repository
from app.schemas import LeaderboardOut
from app.services import standings

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("", response_model=LeaderboardOut)
def leaderboard(repo: Repository = Depends(get_repository)) -> LeaderboardOut:
    now = utcnow()
    event = repo.get_active_event()
    if event is None:
        return LeaderboardOut(
            updated_at=now, total_teams=0, escaped_count=0, rows=[]
        )

    teams = repo.list_teams(event.id)
    grouped: dict[str, list[Progress]] = {team.id: [] for team in teams}
    for progress in repo.list_progress_for_event(event.id):
        grouped.setdefault(progress.team_id, []).append(progress)

    return standings.build_leaderboard(teams, grouped, event, now)
