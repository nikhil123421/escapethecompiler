"""Plain data the backend works with, mirroring the database rows.

These are dataclasses, not Pydantic models: they are internal, and the API
shapes live in schemas.py. Keeping them apart means a database column can
change without renaming an API field in the same edit.
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Event:
    id: str
    slug: str
    name: str
    passcode_hash: str
    total_seconds: int = 90 * 60
    room_seconds: int = 15 * 60
    is_active: bool = True


@dataclass
class Team:
    id: str
    event_id: str
    code: str
    name: str
    members: list[str] = field(default_factory=list)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    escaped: bool = False
    status: str = "racing"  # racing | escaped | expired
    final_attempts: int = 0
    created_at: datetime | None = None


@dataclass
class Progress:
    team_id: str
    room_id: str
    opened_at: datetime | None = None
    solved_at: datetime | None = None
    hints_used: int = 0
    timed_out: bool = False

    @property
    def is_solved(self) -> bool:
        return self.solved_at is not None

    @property
    def is_closed(self) -> bool:
        return self.timed_out and self.solved_at is None


@dataclass
class Submission:
    team_id: str
    room_id: str
    code: str
    passed: bool
    tests_passed: int
    tests_total: int
    error: str | None = None
    language: str = "javascript"
    created_at: datetime | None = None
    id: int | None = None
