"""Deadline arithmetic. Small pure functions, easy to unit test."""

from datetime import datetime, timedelta

from app.models import Event, Progress, Team


def event_deadline(team: Team, event: Event) -> datetime | None:
    if team.started_at is None:
        return None
    return team.started_at + timedelta(seconds=event.total_seconds)


def room_deadline(progress: Progress | None, event: Event) -> datetime | None:
    if progress is None or progress.opened_at is None:
        return None
    return progress.opened_at + timedelta(seconds=event.room_seconds)


def room_status(progress: Progress | None, event: Event, now: datetime) -> str:
    """unopened | open | solved | closed"""
    if progress is None:
        return "unopened"
    if progress.solved_at is not None:
        return "solved"
    if progress.timed_out:
        return "closed"
    deadline = room_deadline(progress, event)
    if deadline is not None and now >= deadline:
        return "closed"
    return "open"


def was_solved_fast(progress: Progress) -> bool:
    if progress.opened_at is None or progress.solved_at is None:
        return False
    return progress.solved_at - progress.opened_at <= timedelta(minutes=10)
