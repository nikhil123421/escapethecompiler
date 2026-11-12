"""Database access, in one file.

Every SQL-touching method lives on a Repository. Services depend on the
`Repository` protocol, never on Supabase directly, which is why the tests can
run the whole game against an in-memory implementation.

Read this file top to bottom and you know exactly what the app stores.
"""

from datetime import datetime
from typing import Protocol

from supabase import Client, create_client

from app.clock import from_iso, to_iso, utcnow
from app.config import Settings
from app.models import Event, Progress, Submission, Team


# ── Row mapping ───────────────────────────────────────────────────────────


def _event_from_row(row: dict) -> Event:
    return Event(
        id=row["id"],
        slug=row["slug"],
        name=row["name"],
        passcode_hash=row["passcode_hash"],
        total_seconds=row["total_seconds"],
        room_seconds=row["room_seconds"],
        is_active=row["is_active"],
    )


def _team_from_row(row: dict) -> Team:
    return Team(
        id=row["id"],
        event_id=row["event_id"],
        code=row["code"],
        name=row["name"],
        pin_hash=row.get("pin_hash"),
        members=row.get("members") or [],
        started_at=from_iso(row.get("started_at")),
        finished_at=from_iso(row.get("finished_at")),
        escaped=bool(row.get("escaped")),
        status=row.get("status") or "racing",
        final_attempts=row.get("final_attempts") or 0,
        created_at=from_iso(row.get("created_at")),
    )


def _progress_from_row(row: dict) -> Progress:
    return Progress(
        team_id=row["team_id"],
        room_id=row["room_id"],
        opened_at=from_iso(row.get("opened_at")),
        solved_at=from_iso(row.get("solved_at")),
        hints_used=row.get("hints_used") or 0,
        timed_out=bool(row.get("timed_out")),
    )


def _submission_from_row(row: dict) -> Submission:
    return Submission(
        id=row.get("id"),
        team_id=row["team_id"],
        room_id=row["room_id"],
        code=row["code"],
        passed=bool(row["passed"]),
        tests_passed=row["tests_passed"],
        tests_total=row["tests_total"],
        error=row.get("error"),
        created_at=from_iso(row.get("created_at")),
    )


# ── The contract ──────────────────────────────────────────────────────────


class Repository(Protocol):
    def get_active_event(self) -> Event | None: ...

    def get_event(self, event_id: str) -> Event | None: ...

    def create_event(
        self, slug: str, name: str, passcode_hash: str, total_seconds: int, room_seconds: int
    ) -> Event: ...

    def find_team(self, event_id: str, code: str) -> Team | None: ...

    def get_team(self, team_id: str) -> Team | None: ...

    def create_team(
        self,
        event_id: str,
        code: str,
        name: str,
        members: list[str],
        pin_hash: str | None = None,
    ) -> Team: ...

    def save_team(self, team: Team) -> None: ...

    def delete_team(self, team_id: str) -> None: ...

    def list_teams(self, event_id: str) -> list[Team]: ...

    def get_progress(self, team_id: str, room_id: str) -> Progress | None: ...

    def list_progress(self, team_id: str) -> list[Progress]: ...

    def list_progress_for_event(self, event_id: str) -> list[Progress]: ...

    def save_progress(self, progress: Progress) -> None: ...

    def delete_progress(self, team_id: str) -> None: ...

    def add_submission(self, submission: Submission) -> None: ...

    def last_submission_at(self, team_id: str, room_id: str) -> datetime | None: ...

    def count_submissions(self, team_id: str, room_id: str) -> int: ...

    def count_submissions_for_team(self, team_id: str) -> int: ...

    def list_submissions(self, limit: int) -> list[Submission]: ...


# ── Supabase implementation ───────────────────────────────────────────────


class SupabaseRepository:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.client: Client = create_client(url, service_role_key)

    def get_active_event(self) -> Event | None:
        rows = (
            self.client.table("events")
            .select("*")
            .eq("is_active", True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
        return _event_from_row(rows[0]) if rows else None

    def get_event(self, event_id: str) -> Event | None:
        rows = self.client.table("events").select("*").eq("id", event_id).limit(1).execute().data
        return _event_from_row(rows[0]) if rows else None

    def create_event(
        self, slug: str, name: str, passcode_hash: str, total_seconds: int, room_seconds: int
    ) -> Event:
        row = (
            self.client.table("events")
            .insert(
                {
                    "slug": slug,
                    "name": name,
                    "passcode_hash": passcode_hash,
                    "total_seconds": total_seconds,
                    "room_seconds": room_seconds,
                }
            )
            .execute()
            .data[0]
        )
        return _event_from_row(row)

    def find_team(self, event_id: str, code: str) -> Team | None:
        rows = (
            self.client.table("teams")
            .select("*")
            .eq("event_id", event_id)
            .eq("code", code)
            .limit(1)
            .execute()
            .data
        )
        return _team_from_row(rows[0]) if rows else None

    def get_team(self, team_id: str) -> Team | None:
        rows = self.client.table("teams").select("*").eq("id", team_id).limit(1).execute().data
        return _team_from_row(rows[0]) if rows else None

    def create_team(
        self,
        event_id: str,
        code: str,
        name: str,
        members: list[str],
        pin_hash: str | None = None,
    ) -> Team:
        row = (
            self.client.table("teams")
            .insert(
                {
                    "event_id": event_id,
                    "code": code,
                    "name": name,
                    "members": members,
                    "pin_hash": pin_hash,
                }
            )
            .execute()
            .data[0]
        )
        return _team_from_row(row)

    def save_team(self, team: Team) -> None:
        self.client.table("teams").update(
            {
                "name": team.name,
                "members": team.members,
                "pin_hash": team.pin_hash,
                "started_at": to_iso(team.started_at),
                "finished_at": to_iso(team.finished_at),
                "escaped": team.escaped,
                "status": team.status,
                "final_attempts": team.final_attempts,
            }
        ).eq("id", team.id).execute()

    def list_teams(self, event_id: str) -> list[Team]:
        rows = (
            self.client.table("teams").select("*").eq("event_id", event_id).execute().data
        )
        return [_team_from_row(row) for row in rows]

    def delete_team(self, team_id: str) -> None:
        self.delete_progress(team_id)
        self.client.table("submissions").delete().eq("team_id", team_id).execute()
        self.client.table("teams").delete().eq("id", team_id).execute()

    def get_progress(self, team_id: str, room_id: str) -> Progress | None:
        rows = (
            self.client.table("room_progress")
            .select("*")
            .eq("team_id", team_id)
            .eq("room_id", room_id)
            .limit(1)
            .execute()
            .data
        )
        return _progress_from_row(rows[0]) if rows else None

    def list_progress(self, team_id: str) -> list[Progress]:
        rows = (
            self.client.table("room_progress").select("*").eq("team_id", team_id).execute().data
        )
        return [_progress_from_row(row) for row in rows]

    def list_progress_for_event(self, event_id: str) -> list[Progress]:
        teams = self.list_teams(event_id)
        if not teams:
            return []
        rows = (
            self.client.table("room_progress")
            .select("*")
            .in_("team_id", [team.id for team in teams])
            .execute()
            .data
        )
        return [_progress_from_row(row) for row in rows]

    def save_progress(self, progress: Progress) -> None:
        self.client.table("room_progress").upsert(
            {
                "team_id": progress.team_id,
                "room_id": progress.room_id,
                "opened_at": to_iso(progress.opened_at),
                "solved_at": to_iso(progress.solved_at),
                "hints_used": progress.hints_used,
                "timed_out": progress.timed_out,
            },
            on_conflict="team_id,room_id",
        ).execute()

    def delete_progress(self, team_id: str) -> None:
        self.client.table("room_progress").delete().eq("team_id", team_id).execute()

    def add_submission(self, submission: Submission) -> None:
        self.client.table("submissions").insert(
            {
                "team_id": submission.team_id,
                "room_id": submission.room_id,
                "code": submission.code,
                "passed": submission.passed,
                "tests_passed": submission.tests_passed,
                "tests_total": submission.tests_total,
                "error": submission.error,
            }
        ).execute()

    def last_submission_at(self, team_id: str, room_id: str) -> datetime | None:
        rows = (
            self.client.table("submissions")
            .select("created_at")
            .eq("team_id", team_id)
            .eq("room_id", room_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
        return from_iso(rows[0]["created_at"]) if rows else None

    def count_submissions(self, team_id: str, room_id: str) -> int:
        result = (
            self.client.table("submissions")
            .select("id", count="exact")
            .eq("team_id", team_id)
            .eq("room_id", room_id)
            .execute()
        )
        return result.count or 0

    def count_submissions_for_team(self, team_id: str) -> int:
        result = (
            self.client.table("submissions")
            .select("id", count="exact")
            .eq("team_id", team_id)
            .execute()
        )
        return result.count or 0

    def list_submissions(self, limit: int = 50) -> list[Submission]:
        rows = (
            self.client.table("submissions")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
        )
        return [_submission_from_row(row) for row in rows]


# ── Factory ───────────────────────────────────────────────────────────────


def create_repository(settings: Settings) -> Repository:
    """Creates the active database repository.

    For beginner developers:
    - If REPOSITORY=memory in .env, this creates a clean in-memory repository.
    - If REPOSITORY=supabase in .env, this connects to your live Supabase database.
    - If Supabase cannot be reached or its SQL tables are not yet created, it logs
      a clear instruction and gracefully falls back to in-memory mode so the server
      and frontend always run smoothly without crashing.
    """
    import logging
    logger = logging.getLogger("uvicorn.error")

    if settings.repository == "memory":
        from app.memory_repository import MemoryRepository, seed_demo_data

        repo = MemoryRepository()
        seed_demo_data(repo)
        return repo

    key = settings.supabase_service_role_key
    if not settings.supabase_url or not key:
        logger.warning(
            "SUPABASE_URL or SUPABASE_SECRET_KEY is not set in .env. "
            "Falling back to clean in-memory repository."
        )
        from app.memory_repository import MemoryRepository, seed_demo_data

        repo = MemoryRepository()
        seed_demo_data(repo)
        return repo

    try:
        repo = SupabaseRepository(settings.supabase_url, key)
        # Verify connection and that tables exist
        repo.get_active_event()
        return repo
    except Exception as exc:
        logger.warning(
            f"Could not connect to Supabase tables ({exc}).\n"
            "   -> Tip: If you haven't run the SQL migration yet, open your Supabase Dashboard -> SQL Editor, "
            "and run the queries in 'supabase/migrations/0001_init.sql'.\n"
            "   -> Falling back to clean in-memory repository so your app keeps working."
        )
        from app.memory_repository import MemoryRepository, seed_demo_data

        repo = MemoryRepository()
        seed_demo_data(repo)
        return repo
