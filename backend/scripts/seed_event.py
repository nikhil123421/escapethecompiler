"""Create the event (and optionally the ten team codes) in the database.

    cd backend
    python scripts/seed_event.py --passcode REBOOT

Run it once per event. It needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
in backend/.env.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.memory_repository import TEAM_NAMES
from app.repository import create_repository
from app.security import hash_passcode


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an Escape the Compiler event.")
    parser.add_argument("--name", default="Escape the Compiler")
    parser.add_argument("--slug", default="spring-2026")
    parser.add_argument("--passcode", default="REBOOT", help="The passcode players type.")
    parser.add_argument("--teams", type=int, default=10, help="How many team codes to create.")
    args = parser.parse_args()

    settings = get_settings()
    if settings.repository == "memory":
        print("REPOSITORY=memory, so the demo event is already seeded. Nothing to do.")
        return

    repo = create_repository(settings)
    event = repo.create_event(
        slug=args.slug,
        name=args.name,
        passcode_hash=hash_passcode(args.passcode),
        total_seconds=90 * 60,
        room_seconds=15 * 60,
    )

    created = 0
    for code, name, members in TEAM_NAMES[: args.teams]:
        if repo.find_team(event.id, code) is None:
            repo.create_team(event.id, code, name, members)
            created += 1

    print(f"Event:   {event.name} ({event.id})")
    print(f"Slug:    {event.slug}")
    print(f"Teams:   {created} created")
    print("Players log in with a team code and the passcode you chose.")


if __name__ == "__main__":
    main()
