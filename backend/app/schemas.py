"""Request and response shapes.

Pydantic models double as the OpenAPI documentation at /docs, so the frontend
team can see exactly what each endpoint accepts and returns.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    """Reject unknown fields instead of silently ignoring typos."""

    model_config = ConfigDict(extra="forbid")


# ── Auth ──────────────────────────────────────────────────────────────────


class LoginRequest(Strict):
    team_code: str = Field(min_length=1, max_length=32)
    team_name: str = Field(min_length=1, max_length=60)
    members: list[str] = Field(default_factory=list, max_length=10)
    passcode: str = Field(min_length=1, max_length=100)


class OrganizerLoginRequest(Strict):
    passcode: str = Field(min_length=1, max_length=100)


class TeamOut(BaseModel):
    id: str
    code: str
    name: str
    members: list[str]
    status: str
    score: int
    started_at: datetime | None
    finished_at: datetime | None
    escaped: bool


class AuthResponse(BaseModel):
    token: str
    team: TeamOut


class OrganizerAuthResponse(BaseModel):
    token: str


# ── Rooms and game state ──────────────────────────────────────────────────


class RoomPublic(BaseModel):
    id: str
    number: int
    title: str
    topic: str
    prompt: str
    starter_code: str
    starter_codes: dict[str, str] = Field(default_factory=dict)


class RoomState(RoomPublic):
    status: str  # unopened | open | solved | closed
    opened_at: datetime | None
    solved_at: datetime | None
    room_deadline: datetime | None
    hints_used: int
    hints_available: int
    code_piece: str | None


class ScoreOut(BaseModel):
    solved_points: int
    speed_bonus: int
    hint_penalty: int
    escape_bonus: int
    total: int


class EventOut(BaseModel):
    name: str
    slug: str
    total_seconds: int
    room_seconds: int
    deadline: datetime | None


class GameState(BaseModel):
    server_time: datetime
    team: TeamOut
    event: EventOut
    rooms: list[RoomState]
    score: ScoreOut
    can_escape: bool


class RunRequest(Strict):
    code: str = Field(max_length=20_000)
    language: str = Field(default="javascript", max_length=30)


class CaseOut(BaseModel):
    index: int
    passed: bool
    got: str | None = None
    error: str | None = None


class RunOut(BaseModel):
    fatal: str | None
    passed: int
    total: int
    cases: list[CaseOut]
    state: GameState


class HintOut(BaseModel):
    hint: str
    hints_used: int
    hints_available: int
    state: GameState


class FinalRequest(Strict):
    code: str = Field(max_length=10)
    word: str = Field(max_length=40)


class FinalOut(BaseModel):
    escaped: bool
    state: GameState


# ── Leaderboard and teams ─────────────────────────────────────────────────


class RoomPip(BaseModel):
    id: str
    number: int
    title: str
    status: str


class LeaderboardRow(BaseModel):
    rank: int
    team_id: str
    code: str
    name: str
    members: list[str]
    solved: int
    hints_used: int
    escaped: bool
    status: str
    score: int
    elapsed_seconds: int | None
    finished_at: datetime | None


class LeaderboardOut(BaseModel):
    updated_at: datetime
    total_teams: int
    escaped_count: int
    rows: list[LeaderboardRow]


class TeamSummary(BaseModel):
    id: str
    code: str
    name: str
    members: list[str]
    status: str
    escaped: bool
    solved: int
    hints_used: int
    score: int
    elapsed_seconds: int | None
    last_activity_at: datetime | None
    rooms: list[RoomPip]


class TeamDetail(TeamSummary):
    started_at: datetime | None
    finished_at: datetime | None
    submissions: int


# ── Admin ─────────────────────────────────────────────────────────────────


class TeamCreate(Strict):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=60)
    members: list[str] = Field(default_factory=list, max_length=10)


class TeamUpdate(Strict):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    members: list[str] | None = Field(default=None, max_length=10)
    status: str | None = Field(default=None, pattern="^(racing|escaped|expired)$")


class SubmissionOut(BaseModel):
    id: int | None
    team_id: str
    team_name: str
    room_id: str
    passed: bool
    tests_passed: int
    tests_total: int
    error: str | None
    language: str = "javascript"
    created_at: datetime | None


class OkResponse(BaseModel):
    ok: bool = True
