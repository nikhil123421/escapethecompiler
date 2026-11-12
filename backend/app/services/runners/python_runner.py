"""Python code execution runner for contest rooms.

Runs user Python code in an isolated subprocess with time and memory constraints.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

from app.content.rooms import Room
from app.services.js_runner import (
    MAX_CODE_LENGTH,
    PROCESS_TIMEOUT_SECONDS,
    RunResult,
    _compare,
    _fatal,
)

PYTHON_HARNESS = r'''
import sys
import json
import traceback

def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
    except Exception as exc:
        print(json.dumps({"fatal": f"Invalid input: {exc}"}))
        return

    code = payload.get("code", "")
    entrypoints = payload.get("entrypoints", [])
    calls = payload.get("calls", [])

    # Namespace for user code
    ns = {}
    try:
        compiled = compile(code, "<user_code>", "exec")
        exec(compiled, ns)
    except Exception as exc:
        err = traceback.format_exc().strip().splitlines()[-1]
        print(json.dumps({"fatal": f"Syntax / Import error: {err}"}))
        return

    # Locate entrypoint
    fn = None
    for name in entrypoints:
        if name in ns and callable(ns[name]):
            fn = ns[name]
            break

    if fn is None:
        target = entrypoints[0] if entrypoints else "solution"
        print(json.dumps({"fatal": f"Function '{target}' was not defined."}))
        return

    results = []
    for call in calls:
        args = call.get("args", [])
        try:
            val = fn(*args)
            results.append({"ok": True, "value": json.dumps(val)})
        except Exception as exc:
            err = traceback.format_exc().strip().splitlines()[-1]
            results.append({"ok": False, "error": f"Runtime error: {err}"})

    print(json.dumps({"results": results}))

if __name__ == "__main__":
    main()
'''


def run_python_tests(
    code: str, room: Room, python_binary: str = sys.executable
) -> RunResult:
    if len(code) > MAX_CODE_LENGTH:
        return _fatal(room, "Your code is too long.")

    entrypoint = room.entrypoints.get("python", room.entrypoint)
    # Support both snake_case and camelCase
    entrypoints = [entrypoint]
    if "_" in entrypoint:
        parts = entrypoint.split("_")
        camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
        entrypoints.append(camel)
    else:
        # camel to snake
        snake = "".join(["_" + c.lower() if c.isupper() else c for c in entrypoint]).lstrip("_")
        entrypoints.append(snake)

    payload = {
        "code": code,
        "entrypoints": entrypoints,
        "calls": [{"args": test.args} for test in room.tests],
    }

    try:
        process = subprocess.run(
            [python_binary, "-B", "-c", PYTHON_HARNESS],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=PROCESS_TIMEOUT_SECONDS,
            cwd=os.environ.get("TEMP", "."),
            check=False,
        )
    except FileNotFoundError:
        return _fatal(room, "The Python runner is not available right now.")
    except subprocess.TimeoutExpired:
        return _fatal(room, "Your code took too long and was stopped (timeout).")

    if process.returncode != 0 and not process.stdout.strip():
        err = process.stderr.strip()[:200] or "Process exited with an error."
        return _fatal(room, f"Runner crashed: {err}")

    try:
        answer = json.loads(process.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return _fatal(room, "The Python runner returned something unreadable.")

    if "fatal" in answer:
        return _fatal(room, answer["fatal"])

    return _compare(room, answer.get("results", []))
