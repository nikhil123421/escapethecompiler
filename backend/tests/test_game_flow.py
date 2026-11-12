"""End-to-end backend behaviour, through the real HTTP API.

The database is the in-memory repository, but everything else is real:
JWT auth, the game rules, and the Node sandbox.
"""

from datetime import timedelta

from app.clock import utcnow
from app.models import Progress

SOLUTIONS = {
    "stack": """
function evalPostfix(tokens) {
  const stack = [];
  for (const token of tokens) {
    if ('+-*/'.includes(token)) {
      const b = stack.pop();
      const a = stack.pop();
      if (token === '+') stack.push(a + b);
      else if (token === '-') stack.push(a - b);
      else if (token === '*') stack.push(a * b);
      else stack.push(a / b);
    } else {
      stack.push(Number(token));
    }
  }
  return stack.pop();
}
""",
    "array": """
function searchRotated(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return mid;
    if (arr[lo] <= arr[mid]) {
      if (target >= arr[lo] && target < arr[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (target > arr[mid] && target <= arr[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
""",
    "graph": """
function bfs(graph, start) {
  const queue = [start];
  const seen = { [start]: true };
  let order = '';
  while (queue.length) {
    const node = queue.shift();
    order += node;
    for (const next of graph[node] || []) {
      if (!seen[next]) { seen[next] = true; queue.push(next); }
    }
  }
  return order;
}
""",
    "debug": """
function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum = sum + arr[i];
  }
  return sum;
}
""",
    "cipher": """
function caesarDecode(text, shift) {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out += String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
  }
  return out;
}
""",
}


def login(client, code="TEAM01", name="Null Pointer Exception", passcode="REBOOT"):
    response = client.post(
        "/api/auth/login",
        json={
            "team_code": code,
            "team_name": name,
            "members": ["Aarav", "Meera"],
            "passcode": passcode,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_wrong_passcode_is_rejected(client):
    response = client.post(
        "/api/auth/login",
        json={"team_code": "TEAM01", "team_name": "X", "passcode": "NOPE"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "bad_passcode"


def test_team_code_cannot_be_hijacked_with_a_different_name(client, auth):
    auth()
    response = client.post(
        "/api/auth/login",
        json={"team_code": "TEAM01", "team_name": "Impostors", "passcode": "REBOOT"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "name_taken"


def test_state_requires_a_token(client):
    assert client.get("/api/game/state").status_code == 401


def test_full_run_solves_every_room_and_escapes(client, auth):
    headers = auth()

    state = client.get("/api/game/state", headers=headers).json()
    assert [room["status"] for room in state["rooms"]] == ["unopened"] * 5
    assert state["can_escape"] is False

    for room_id, solution in SOLUTIONS.items():
        response = client.post(
            f"/api/game/rooms/{room_id}/run",
            json={"code": solution},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["fatal"] is None, body
        assert body["passed"] == body["total"], body
        assert body["cases"] and all(case["passed"] for case in body["cases"])

    state = client.get("/api/game/state", headers=headers).json()
    assert state["can_escape"] is True
    # 5 rooms x (100 solved + 30 speed) and no escape bonus yet
    assert state["score"]["total"] == 650

    wrong = client.post(
        "/api/game/final", json={"code": "0000", "word": "NOPE"}, headers=headers
    )
    assert wrong.status_code == 400
    assert wrong.json()["code"] == "bad_final"

    final = client.post(
        "/api/game/final", json={"code": "9463", "word": "REBOOT"}, headers=headers
    )
    assert final.status_code == 200, final.text
    assert final.json()["escaped"] is True
    assert final.json()["state"]["team"]["status"] == "escaped"
    assert final.json()["state"]["score"]["total"] == 700

    board = client.get("/api/leaderboard").json()
    assert board["total_teams"] == 1
    assert board["rows"][0]["code"] == "TEAM01"
    assert board["rows"][0]["score"] == 700


def test_hint_reduces_score_and_is_limited(client, auth):
    headers = auth()

    first = client.post("/api/game/rooms/stack/hint", headers=headers)
    assert first.status_code == 200
    body = first.json()
    assert body["hints_used"] == 1
    assert body["hints_available"] == 2
    assert body["hint"]

    for _ in range(2):
        assert client.post("/api/game/rooms/stack/hint", headers=headers).status_code == 200

    exhausted = client.post("/api/game/rooms/stack/hint", headers=headers)
    assert exhausted.status_code == 409
    assert exhausted.json()["code"] == "no_hints_left"


def test_run_rate_limit(client, auth):
    headers = auth()
    bad_code = "function evalPostfix() { return 0; }"

    assert (
        client.post(
            "/api/game/rooms/stack/run", json={"code": bad_code}, headers=headers
        ).status_code
        == 200
    )
    second = client.post(
        "/api/game/rooms/stack/run", json={"code": bad_code}, headers=headers
    )
    assert second.status_code == 429
    assert second.json()["code"] == "too_fast"


def test_room_closes_after_fifteen_minutes(client, auth, repo):
    headers = auth()
    event = repo.get_active_event()
    team = repo.list_teams(event.id)[0]

    repo.save_progress(
        Progress(
            team_id=team.id,
            room_id="stack",
            opened_at=utcnow() - timedelta(minutes=16),
        )
    )

    state = client.get("/api/game/state", headers=headers).json()
    stack = state["rooms"][0]
    assert stack["status"] == "closed"
    assert stack["code_piece"] == "9"

    response = client.post(
        "/api/game/rooms/stack/run",
        json={"code": SOLUTIONS["stack"]},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["code"] == "room_closed"


def test_public_team_pages(client, auth):
    headers = auth()
    client.post(
        "/api/game/rooms/stack/run", json={"code": SOLUTIONS["stack"]}, headers=headers
    )

    teams = client.get("/api/teams").json()
    assert len(teams) == 1
    assert teams[0]["members"] == ["Aarav", "Meera"]
    assert teams[0]["solved"] == 1
    assert teams[0]["rooms"][0]["status"] == "solved"

    detail = client.get(f"/api/teams/{teams[0]['id']}").json()
    assert detail["submissions"] == 1


def test_organizer_can_create_and_reset_teams(client):
    token = client.post(
        "/api/auth/organizer", json={"passcode": "ORGANIZER"}
    ).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/admin/teams",
        json={"code": "team99", "name": "Late Joiners", "members": ["Zoya"]},
        headers=headers,
    )
    assert created.status_code == 200, created.text
    assert created.json()["code"] == "TEAM99"

    reset = client.post("/api/admin/event/reset", headers=headers)
    assert reset.status_code == 200

    board = client.get("/api/leaderboard").json()
    assert all(row["score"] == 0 for row in board["rows"])
    assert board["escaped_count"] == 0


def test_organizer_can_delete_team(client):
    token = client.post(
        "/api/auth/organizer", json={"passcode": "ORGANIZER"}
    ).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/admin/teams",
        json={"code": "TO_DELETE", "name": "Temp Team", "members": ["Tester"]},
        headers=headers,
    )
    assert created.status_code == 200
    team_id = created.json()["id"]

    delete_res = client.delete(f"/api/admin/teams/{team_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["ok"] is True

    # Verifying team is gone
    get_res = client.get(f"/api/teams/{team_id}")
    assert get_res.status_code == 404


def test_organizer_endpoints_need_an_organizer_token(client, auth):
    team_headers = auth()
    assert client.get("/api/admin/teams", headers=team_headers).status_code == 403
