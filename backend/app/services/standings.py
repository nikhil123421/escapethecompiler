"""Turning stored rows into what the leaderboard and teams pages display."""

from datetime import datetime

from app.clock import seconds_between
from app.content.rooms import ROOMS
from app.models import Event, Progress, Team
from app.schemas import LeaderboardOut, LeaderboardRow, RoomPip, TeamSummary
from app.services import scoring, timers

NEVER = 10**9


def room_pips(progress: dict[str, Progress], event: Event, now: datetime) -> list[RoomPip]:
    return [
        RoomPip(
            id=room.id,
            number=room.number,
            title=room.title,
            status=timers.room_status(progress.get(room.id), event, now),
        )
        for room in ROOMS
    ]


def summary_for(
    team: Team, progress_rows: list[Progress], event: Event, now: datetime
) -> TeamSummary:
    by_room = {progress.room_id: progress for progress in progress_rows}
    score = scoring.score_for(progress_rows, team.escaped, event.room_seconds)

    # A racing team's "elapsed" is simply how long it has been playing.
    elapsed = seconds_between(team.started_at, team.finished_at or now)

    stamps = [team.started_at]
    for progress in progress_rows:
        stamps.extend([progress.opened_at, progress.solved_at])
    activity = max((stamp for stamp in stamps if stamp is not None), default=None)

    return TeamSummary(
        id=team.id,
        code=team.code,
        name=team.name,
        members=team.members,
        status=team.status,
        escaped=team.escaped,
        solved=score.solved_rooms,
        hints_used=score.hints_used,
        score=score.total,
        elapsed_seconds=elapsed,
        last_activity_at=activity,
        rooms=room_pips(by_room, event, now),
    )


def build_leaderboard(
    teams: list[Team],
    progress_by_team: dict[str, list[Progress]],
    event: Event,
    now: datetime,
) -> LeaderboardOut:
    entries: list[tuple[TeamSummary, Team]] = []
    for team in teams:
        summary = summary_for(team, progress_by_team.get(team.id, []), event, now)
        entries.append((summary, team))

    def sort_key(entry: tuple[TeamSummary, Team]) -> tuple:
        summary, team = entry
        finished = team.finished_at is not None
        return (
            -summary.score,
            0 if finished else 1,
            summary.elapsed_seconds if finished and summary.elapsed_seconds is not None else NEVER,
            team.started_at.timestamp() if team.started_at else 0,
        )

    entries.sort(key=sort_key)

    rows = [
        LeaderboardRow(
            rank=index + 1,
            team_id=summary.id,
            code=summary.code,
            name=summary.name,
            members=summary.members,
            solved=summary.solved,
            hints_used=summary.hints_used,
            escaped=summary.escaped,
            status=summary.status,
            score=summary.score,
            elapsed_seconds=summary.elapsed_seconds,
            finished_at=team.finished_at,
        )
        for index, (summary, team) in enumerate(entries)
    ]

    return LeaderboardOut(
        updated_at=now,
        total_teams=len(rows),
        escaped_count=sum(1 for row in rows if row.escaped),
        rows=rows,
    )
