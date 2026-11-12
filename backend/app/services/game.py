"""Every game rule, in one place.

The router stays thin: it checks who you are, then calls one function here.
Each function returns the full new game state, so the frontend never has to
guess what changed.
"""

from datetime import datetime, timedelta

from app.clock import utcnow
from app.config import get_settings
from app.content.rooms import FINAL_CODE, FINAL_WORD, ROOMS, get_room
from app.errors import ApiError
from app.models import Event, Progress, Submission, Team
from app.repository import Repository
from app.schemas import (
    CaseOut,
    EventOut,
    FinalOut,
    GameState,
    HintOut,
    RoomState,
    RunOut,
    ScoreOut,
    TeamOut,
)
from app.services import code_runner, scoring, timers
from app.services.js_runner import RunResult

MIN_SECONDS_BETWEEN_RUNS = 1.5
MAX_SUBMISSIONS_PER_ROOM = 100


# ── Shared helpers ────────────────────────────────────────────────────────


def _event_for(repo: Repository, team: Team) -> Event:
    event = repo.get_event(team.event_id)
    if event is None:
        raise ApiError("event_missing", "This event no longer exists.", status=404)
    return event


def _refresh(
    repo: Repository, team: Team, event: Event, now: datetime
) -> dict[str, Progress]:
    """Close expired rooms and expire the team. Persists only what changed."""
    rows = repo.list_progress(team.id)

    for progress in rows:
        if progress.opened_at and progress.solved_at is None and not progress.timed_out:
            deadline = progress.opened_at + timedelta(seconds=event.room_seconds)
            if now >= deadline:
                progress.timed_out = True
                repo.save_progress(progress)

    if team.status == "racing" and team.started_at:
        deadline = team.started_at + timedelta(seconds=event.total_seconds)
        if now >= deadline:
            team.status = "expired"
            team.finished_at = deadline
            repo.save_team(team)

    return {progress.room_id: progress for progress in rows}


def _prepare(
    repo: Repository, team: Team
) -> tuple[Team, Event, dict[str, Progress], datetime]:
    now = utcnow()
    event = _event_for(repo, team)
    progress = _refresh(repo, team, event, now)
    return team, event, progress, now


def _ensure_racing(team: Team, event: Event, now: datetime) -> None:
    if team.escaped:
        raise ApiError("already_escaped", "Your team has already escaped.", status=409)

    deadline = timers.event_deadline(team, event)
    if team.status == "expired" or (deadline is not None and now >= deadline):
        raise ApiError(
            "event_over",
            "The 90 minutes are over. The system has shut down.",
            status=409,
        )


def _score(team: Team, progress: dict[str, Progress], event: Event) -> scoring.Score:
    return scoring.score_for(list(progress.values()), team.escaped, event.room_seconds)


def team_out(team: Team, score: int) -> TeamOut:
    return TeamOut(
        id=team.id,
        code=team.code,
        name=team.name,
        members=team.members,
        status=team.status,
        score=score,
        started_at=team.started_at,
        finished_at=team.finished_at,
        escaped=team.escaped,
    )


def _room_state(
    room_id: str, progress: Progress | None, event: Event, now: datetime
) -> RoomState:
    room = get_room(room_id)
    status = timers.room_status(progress, event, now)
    revealed = status in ("solved", "closed")
    hints_used = progress.hints_used if progress else 0

    return RoomState(
        id=room.id,
        number=room.number,
        title=room.title,
        topic=room.topic,
        prompt=room.prompt,
        starter_code=room.starter_code,
        starter_codes=room.starter_codes,
        status=status,
        opened_at=progress.opened_at if progress else None,
        solved_at=progress.solved_at if progress else None,
        room_deadline=timers.room_deadline(progress, event),
        hints_used=hints_used,
        hints_available=max(0, len(room.hints) - hints_used),
        code_piece=room.code_piece if revealed else None,
    )


def build_state(
    team: Team, event: Event, progress: dict[str, Progress], now: datetime
) -> GameState:
    score = _score(team, progress, event)
    rooms = [_room_state(room.id, progress.get(room.id), event, now) for room in ROOMS]
    all_done = all(room.status in ("solved", "closed") for room in rooms)

    return GameState(
        server_time=now,
        team=team_out(team, score.total),
        event=EventOut(
            name=event.name,
            slug=event.slug,
            total_seconds=event.total_seconds,
            room_seconds=event.room_seconds,
            deadline=timers.event_deadline(team, event),
        ),
        rooms=rooms,
        score=ScoreOut(
            solved_points=score.solved_points,
            speed_bonus=score.speed_bonus,
            hint_penalty=score.hint_penalty,
            escape_bonus=score.escape_bonus,
            total=score.total,
        ),
        can_escape=all_done and not team.escaped and team.status != "expired",
    )


# ── Actions ───────────────────────────────────────────────────────────────


def get_state(repo: Repository, team: Team) -> GameState:
    team, event, progress, now = _prepare(repo, team)
    return build_state(team, event, progress, now)


def open_room(repo: Repository, team: Team, room_id: str) -> GameState:
    room = get_room(room_id)
    team, event, progress, now = _prepare(repo, team)
    _ensure_racing(team, event, now)

    existing = progress.get(room.id)
    if existing is None:
        repo.save_progress(Progress(team_id=team.id, room_id=room.id, opened_at=now))
    elif existing.opened_at is None:
        existing.opened_at = now
        repo.save_progress(existing)

    return get_state(repo, team)


def run_code(
    repo: Repository, team: Team, room_id: str, code: str, language: str = "javascript"
) -> RunOut:
    room = get_room(room_id)
    team, event, progress, now = _prepare(repo, team)
    _ensure_racing(team, event, now)

    existing = progress.get(room.id)
    if existing is None:
        existing = Progress(team_id=team.id, room_id=room.id, opened_at=now)
        progress[room.id] = existing
        repo.save_progress(existing)

    if existing.solved_at is not None:
        raise ApiError("room_solved", "You already solved this room.", status=409)

    if timers.room_status(existing, event, now) == "closed":
        raise ApiError(
            "room_closed",
            "The 15 minutes for this room are over. Its code piece has been revealed.",
            status=409,
        )

    _enforce_rate_limit(repo, team, room.id, now)

    result = code_runner.run_tests(
        code, room, language=language, node_binary=get_settings().node_binary
    )

    repo.add_submission(
        Submission(
            team_id=team.id,
            room_id=room.id,
            code=code,
            passed=result.all_passed,
            tests_passed=result.passed,
            tests_total=result.total,
            error=result.fatal,
            language=language,
        )
    )

    if result.all_passed:
        existing.solved_at = utcnow()
        repo.save_progress(existing)

    state = build_state(team, _event_for(repo, team), progress, utcnow())
    return RunOut(
        fatal=result.fatal,
        passed=result.passed,
        total=result.total,
        cases=_cases_out(result),
        state=state,
    )


def take_hint(repo: Repository, team: Team, room_id: str) -> HintOut:
    room = get_room(room_id)
    team, event, progress, now = _prepare(repo, team)
    _ensure_racing(team, event, now)

    existing = progress.get(room.id)
    if existing is None:
        existing = Progress(team_id=team.id, room_id=room.id, opened_at=now)
        progress[room.id] = existing
        repo.save_progress(existing)

    if existing.solved_at is not None:
        raise ApiError("room_solved", "You already solved this room.", status=409)

    if timers.room_status(existing, event, now) == "closed":
        raise ApiError("room_closed", "This room is closed.", status=409)

    if existing.hints_used >= len(room.hints):
        raise ApiError("no_hints_left", "There are no hints left for this room.", status=409)

    hint = room.hints[existing.hints_used]
    existing.hints_used += 1
    repo.save_progress(existing)

    state = build_state(team, event, progress, utcnow())
    return HintOut(
        hint=hint,
        hints_used=existing.hints_used,
        hints_available=max(0, len(room.hints) - existing.hints_used),
        state=state,
    )


def submit_final(repo: Repository, team: Team, code: str, word: str) -> FinalOut:
    team, event, progress, now = _prepare(repo, team)
    _ensure_racing(team, event, now)

    statuses = [timers.room_status(progress.get(room.id), event, now) for room in ROOMS]
    if not all(status in ("solved", "closed") for status in statuses):
        raise ApiError(
            "rooms_remaining",
            "Finish or close every room before opening the final lock.",
            status=409,
        )

    team.final_attempts += 1
    solved = code.strip() == FINAL_CODE and word.strip().upper() == FINAL_WORD

    if solved:
        team.escaped = True
        team.status = "escaped"
        team.finished_at = utcnow()

    repo.save_team(team)

    if not solved:
        raise ApiError(
            "bad_final",
            "The lock did not open. Check the four digits in room order and the word.",
        )

    state = build_state(team, event, progress, utcnow())
    return FinalOut(escaped=True, state=state)


# ── Internals ─────────────────────────────────────────────────────────────


def _enforce_rate_limit(repo: Repository, team: Team, room_id: str, now: datetime) -> None:
    last_run = repo.last_submission_at(team.id, room_id)
    if last_run and (now - last_run).total_seconds() < MIN_SECONDS_BETWEEN_RUNS:
        raise ApiError("too_fast", "Give it a second before running again.", status=429)

    if repo.count_submissions(team.id, room_id) >= MAX_SUBMISSIONS_PER_ROOM:
        raise ApiError(
            "too_many_runs",
            "You have run this room too many times. Ask an organizer for help.",
            status=429,
        )


def _cases_out(result: RunResult) -> list[CaseOut]:
    return [
        CaseOut(index=case.index, passed=case.passed, got=case.got, error=case.error)
        for case in result.tests
    ]
