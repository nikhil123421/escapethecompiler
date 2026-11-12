"""Time helpers. The whole backend stores and compares UTC."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def from_iso(value: str | None) -> datetime | None:
    """Parse a timestamp coming from the database."""
    if not value:
        return None
    # Postgres may return a trailing Z, and fromisoformat handles it in 3.11+.
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def to_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def seconds_between(start: datetime | None, end: datetime | None) -> int | None:
    if start is None or end is None:
        return None
    return max(0, int((end - start).total_seconds()))
