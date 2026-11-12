import os

os.environ["JWT_SECRET"] = "test-secret-at-least-thirty-two-bytes-long"
os.environ["REPOSITORY"] = "memory"
os.environ["ORGANIZER_PASSCODE"] = "ORGANIZER"

import pytest
from fastapi.testclient import TestClient

from app.deps import get_repository
from app.main import app
from app.memory_repository import MemoryRepository
from app.security import hash_passcode

PASSCODE = "REBOOT"
# Hashing is deliberately slow; do it once for every test run.
PASSCODE_HASH = hash_passcode(PASSCODE)


@pytest.fixture
def repo() -> MemoryRepository:
    repository = MemoryRepository()
    repository.create_event("test", "Test event", PASSCODE_HASH, 90 * 60, 15 * 60)
    return repository


@pytest.fixture
def client(repo):
    app.dependency_overrides[get_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth(client):
    def login(code: str = "TEAM01", name: str = "Null Pointer Exception", members=None):
        response = client.post(
            "/api/auth/login",
            json={
                "team_code": code,
                "team_name": name,
                "members": members if members is not None else ["Aarav", "Meera"],
                "passcode": PASSCODE,
            },
        )
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['token']}"}

    return login
