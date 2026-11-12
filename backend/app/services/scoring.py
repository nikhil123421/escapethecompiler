"""The score formula. This is the only place it exists.

    +100  room solved
     +30  solved within 10 minutes of opening it
     -20  each hint used
     +50  escaped the system
       0  floor, a team can never go negative

A room solved after its own 15-minute window is worth nothing, even though the
server normally prevents that from happening at all.
"""

from dataclasses import dataclass
from datetime import timedelta

from app.models import Progress

SOLVED_POINTS = 100
SPEED_BONUS = 30
SPEED_WINDOW = timedelta(minutes=10)
HINT_COST = 20
ESCAPE_BONUS = 50


@dataclass(frozen=True)
class Score:
    solved_rooms: int
    hints_used: int
    solved_points: int
    speed_bonus: int
    hint_penalty: int
    escape_bonus: int
    total: int


def score_for(progress_rows: list[Progress], escaped: bool, room_seconds: int) -> Score:
    solved_rooms = 0
    solved_points = 0
    speed_bonus = 0

    for progress in progress_rows:
        if progress.solved_at is None:
            continue
        solved_rooms += 1

        # Defensive: never award points for a solve outside the room's window.
        duration = (
            progress.solved_at - progress.opened_at
            if progress.opened_at
            else timedelta(0)
        )
        if duration > timedelta(seconds=room_seconds):
            continue

        solved_points += SOLVED_POINTS
        if duration <= SPEED_WINDOW:
            speed_bonus += SPEED_BONUS

    hints_used = sum(progress.hints_used for progress in progress_rows)
    hint_penalty = HINT_COST * hints_used
    escape_bonus = ESCAPE_BONUS if escaped else 0

    total = solved_points + speed_bonus - hint_penalty + escape_bonus

    return Score(
        solved_rooms=solved_rooms,
        hints_used=hints_used,
        solved_points=solved_points,
        speed_bonus=speed_bonus,
        hint_penalty=hint_penalty,
        escape_bonus=escape_bonus,
        total=max(0, total),
    )
