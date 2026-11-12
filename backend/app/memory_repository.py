"""An in-memory Repository.

Two uses:
  * tests, so the whole game can be exercised without a database;
  * `REPOSITORY=memory`, so the frontend can be built before the Supabase
    keys exist. Data disappears when the server restarts.
"""

import threading
from dataclasses import replace
from datetime import timedelta

from app.clock import utcnow
from app.content.rooms import ROOMS
from app.models import Event, Progress, Submission, Team
from app.security import hash_passcode

TEAM_NAMES = [
    ("TEAM01", "Null Pointer Exception", ["Aarav", "Meera", "Kabir"]),
    ("TEAM02", "Stack Overflow", ["Isha", "Rohan"]),
    ("TEAM03", "Segfault Squad", ["Ananya", "Dev", "Nikhil"]),
    ("TEAM04", "Runtime Terrors", ["Sara", "Yash"]),
    ("TEAM05", "Binary Bandits", ["Tanvi", "Arjun", "Mira"]),
    ("TEAM06", "Off By One", ["Karan", "Priya"]),
    ("TEAM07", "The Recursives", ["Aditya", "Neha"]),
    ("TEAM08", "Hash Browns", ["Riya", "Vikram"]),
    ("TEAM09", "Queue Tees", ["Aman", "Sneha"]),
    ("TEAM10", "Base Case", ["Ira", "Manav"]),
]


class MemoryRepository:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.events: dict[str, Event] = {}
        self.teams: dict[str, Team] = {}
        self.progress: dict[tuple[str, str], Progress] = {}
        self.submissions: list[Submission] = []
        self._next_submission_id = 1

    # events
    def get_active_event(self) -> Event | None:
        with self._lock:
            for event in self.events.values():
                if event.is_active:
                    return replace(event)
            return None

    def get_event(self, event_id: str) -> Event | None:
        with self._lock:
            event = self.events.get(event_id)
            return replace(event) if event else None

    def create_event(
        self, slug: str, name: str, passcode_hash: str, total_seconds: int, room_seconds: int
    ) -> Event:
        with self._lock:
            event = Event(
                id=f"event-{len(self.events) + 1}",
                slug=slug,
                name=name,
                passcode_hash=passcode_hash,
                total_seconds=total_seconds,
                room_seconds=room_seconds,
            )
            self.events[event.id] = event
            return replace(event)

    # teams
    def find_team(self, event_id: str, code: str) -> Team | None:
        with self._lock:
            for team in self.teams.values():
                if team.event_id == event_id and team.code == code:
                    return replace(team)
            return None

    def get_team(self, team_id: str) -> Team | None:
        with self._lock:
            team = self.teams.get(team_id)
            return replace(team) if team else None

    def create_team(self, event_id: str, code: str, name: str, members: list[str]) -> Team:
        with self._lock:
            team = Team(
                id=f"team-{len(self.teams) + 1}",
                event_id=event_id,
                code=code,
                name=name,
                members=list(members),
                created_at=utcnow(),
            )
            self.teams[team.id] = team
            return replace(team)

    def save_team(self, team: Team) -> None:
        with self._lock:
            self.teams[team.id] = replace(team)

    def list_teams(self, event_id: str) -> list[Team]:
        with self._lock:
            return [replace(t) for t in self.teams.values() if t.event_id == event_id]

    def delete_team(self, team_id: str) -> None:
        with self._lock:
            self.delete_progress(team_id)
            self.submissions = [s for s in self.submissions if s.team_id != team_id]
            self.teams.pop(team_id, None)

    # progress
    def get_progress(self, team_id: str, room_id: str) -> Progress | None:
        with self._lock:
            progress = self.progress.get((team_id, room_id))
            return replace(progress) if progress else None

    def list_progress(self, team_id: str) -> list[Progress]:
        with self._lock:
            return [
                replace(p) for (tid, _), p in self.progress.items() if tid == team_id
            ]

    def list_progress_for_event(self, event_id: str) -> list[Progress]:
        with self._lock:
            team_ids = {t.id for t in self.teams.values() if t.event_id == event_id}
            return [
                replace(p)
                for (tid, _), p in self.progress.items()
                if tid in team_ids
            ]

    def save_progress(self, progress: Progress) -> None:
        with self._lock:
            self.progress[(progress.team_id, progress.room_id)] = replace(progress)

    def delete_progress(self, team_id: str) -> None:
        with self._lock:
            for key in [k for k in self.progress if k[0] == team_id]:
                del self.progress[key]

    # submissions
    def add_submission(self, submission: Submission) -> None:
        with self._lock:
            stored = replace(submission, id=self._next_submission_id, created_at=utcnow())
            self._next_submission_id += 1
            self.submissions.append(stored)

    def last_submission_at(self, team_id: str, room_id: str) -> object:
        with self._lock:
            matches = [
                s
                for s in self.submissions
                if s.team_id == team_id and s.room_id == room_id
            ]
            return matches[-1].created_at if matches else None

    def count_submissions(self, team_id: str, room_id: str) -> int:
        with self._lock:
            return sum(
                1
                for s in self.submissions
                if s.team_id == team_id and s.room_id == room_id
            )

    def count_submissions_for_team(self, team_id: str) -> int:
        with self._lock:
            return sum(1 for s in self.submissions if s.team_id == team_id)

    def list_submissions(self, limit: int = 50) -> list[Submission]:
        with self._lock:
            return [replace(s) for s in self.submissions[-limit:]][::-1]


def seed_demo_data(repo: MemoryRepository) -> None:
    """Initializes the active event so teams can log in. No sample or fake teams are created."""
    repo.create_event(
        slug="live",
        name="Escape the Compiler",
        passcode_hash=hash_passcode("REBOOT"),
        total_seconds=90 * 60,
        room_seconds=15 * 60,
    )
