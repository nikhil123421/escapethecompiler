from datetime import timedelta

from app.clock import utcnow
from app.models import Progress
from app.services.scoring import score_for


def progress(minutes_ago: int, solved: bool, hints: int = 0) -> Progress:
    opened = utcnow() - timedelta(minutes=minutes_ago)
    return Progress(
        team_id="t1",
        room_id="stack",
        opened_at=opened,
        solved_at=opened + timedelta(minutes=6) if solved else None,
        hints_used=hints,
    )


def test_no_progress_scores_zero():
    assert score_for([], escaped=False, room_seconds=900).total == 0


def test_fast_solve_gets_speed_bonus():
    score = score_for([progress(10, solved=True)], escaped=False, room_seconds=900)
    assert score.solved_points == 100
    assert score.speed_bonus == 30
    assert score.total == 130


def test_solve_inside_room_but_outside_speed_window():
    # opened 12 minutes before solving: 100 points, no +30 bonus
    slow = Progress(
        team_id="t1",
        room_id="stack",
        opened_at=utcnow() - timedelta(minutes=12),
        solved_at=utcnow(),
    )
    score = score_for([slow], escaped=False, room_seconds=900)
    assert score.total == 100


def test_hints_cost_twenty_each():
    score = score_for([progress(10, solved=False, hints=2)], escaped=False, room_seconds=900)
    assert score.hint_penalty == 40
    assert score.total == 0  # floor, never negative


def test_escape_bonus():
    score = score_for([progress(10, solved=True)], escaped=True, room_seconds=900)
    assert score.escape_bonus == 50
    assert score.total == 180


def test_room_solved_after_window_scores_nothing():
    late = Progress(
        team_id="t1",
        room_id="stack",
        opened_at=utcnow() - timedelta(minutes=16),
        solved_at=utcnow() - timedelta(seconds=30),
    )
    score = score_for([late], escaped=False, room_seconds=900)
    assert score.solved_points == 0
    assert score.total == 0
