"""One line of JavaScript per test, run in a locked-down Node process.

How it works:
  1. Python sends the player's code, the function name and the test arguments
     to `js_harness.js` over stdin.
  2. The harness runs the code inside a fresh `vm` context: no `require`, no
     `process`, no filesystem, and string code generation (eval/Function) is
     switched off.
  3. Each call runs in its own script with a 1.5 s timeout, so an infinite
     loop dies instead of hanging the server.
  4. The harness prints JSON. Python compares the values to the hidden
     expected answers, which never leave the backend.

The expected values are deliberately not sent to Node: even a sandbox escape
would not reveal the answers.
"""

import json
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from app.content.rooms import Room, TestCase

HARNESS_PATH = Path(__file__).with_name("js_harness.js")
PROCESS_TIMEOUT_SECONDS = 10
MAX_CODE_LENGTH = 20_000
MAX_DISPLAY_LENGTH = 160


@dataclass
class CaseResult:
    index: int
    passed: bool
    got: str | None = None
    error: str | None = None


@dataclass
class RunResult:
    tests: list[CaseResult] = field(default_factory=list)
    passed: int = 0
    total: int = 0
    fatal: str | None = None

    @property
    def all_passed(self) -> bool:
        return self.fatal is None and self.total > 0 and self.passed == self.total


def run_tests(code: str, room: Room, node_binary: str = "node") -> RunResult:
    if len(code) > MAX_CODE_LENGTH:
        return _fatal(room, "Your code is too long.")

    payload = {
        "code": code,
        "entrypoint": room.entrypoint,
        "calls": [{"args": json.dumps(test.args)} for test in room.tests],
    }

    try:
        process = subprocess.run(
            [
                node_binary,
                "--no-warnings",
                "--max-old-space-size=128",
                "--disallow-code-generation-from-strings",
                str(HARNESS_PATH),
            ],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=PROCESS_TIMEOUT_SECONDS,
            cwd=os.environ.get("TEMP", "."),
            check=False,
        )
    except FileNotFoundError:
        return _fatal(room, "The code runner is not available right now.")
    except subprocess.TimeoutExpired:
        return _fatal(room, "Your code took too long and was stopped.")

    if process.returncode != 0 and not process.stdout.strip():
        return _fatal(room, "The code runner crashed. Check for a syntax error.")

    try:
        answer = json.loads(process.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return _fatal(room, "The code runner returned something unreadable.")

    if "fatal" in answer:
        return _fatal(room, answer["fatal"])

    return _compare(room, answer.get("results", []))


def _compare(room: Room, results: list[dict]) -> RunResult:
    cases: list[CaseResult] = []
    passed = 0

    for index, test in enumerate(room.tests):
        raw = results[index] if index < len(results) else {"ok": False, "error": "No result."}

        if not raw.get("ok"):
            cases.append(
                CaseResult(index=index, passed=False, error=_short(raw.get("error", "Failed.")))
            )
            continue

        got_text = raw.get("value", "null")
        try:
            got_value = json.loads(got_text)
        except (TypeError, ValueError):
            cases.append(
                CaseResult(index=index, passed=False, error="Your function returned something unreadable.")
            )
            continue

        ok = values_equal(got_value, test.expected)
        if ok:
            passed += 1
        cases.append(
            CaseResult(index=index, passed=ok, got=None if ok else _short(got_text))
        )

    return RunResult(tests=cases, passed=passed, total=len(room.tests))


def values_equal(got, expected) -> bool:
    """Compare a JSON-decoded answer with the expected Python value."""
    if isinstance(got, bool) or isinstance(expected, bool):
        return isinstance(got, bool) and isinstance(expected, bool) and got == expected
    if isinstance(got, (int, float)) and isinstance(expected, (int, float)):
        return float(got) == float(expected)
    return got == expected


def _fatal(room: Room, message: str) -> RunResult:
    return RunResult(tests=[], passed=0, total=len(room.tests), fatal=message)


def _short(text: str) -> str:
    text = str(text)
    return text if len(text) <= MAX_DISPLAY_LENGTH else text[: MAX_DISPLAY_LENGTH - 1] + "…"


# Kept for tests that want to show a failure case without a network round trip.
def case_from(test: TestCase, index: int, got: str) -> CaseResult:
    ok = got == json.dumps(test.expected)
    return CaseResult(index=index, passed=ok, got=None if ok else got)
