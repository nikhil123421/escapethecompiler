"""Unified code execution runner dispatcher.

Supports:
- JavaScript (Node.js / QuickJS sandbox)
- Python 3 (subprocess sandbox)
- C++ (g++ compilation + native execution)
- Java (javac compilation + JVM execution)
"""

import json
from app.content.rooms import Room
from app.services.js_runner import CaseResult, RunResult, _fatal, _short, values_equal
from app.services.js_runner import run_tests as run_js_tests


def compare_results(room: Room, results: list[dict]) -> RunResult:
    """Compare execution output across any language against the hidden test cases."""
    cases: list[CaseResult] = []
    passed = 0

    for index, test in enumerate(room.tests):
        raw = results[index] if index < len(results) else {"ok": False, "error": "No result."}

        if not raw.get("ok"):
            cases.append(
                CaseResult(index=index, passed=False, error=_short(raw.get("error", "Failed.")))
            )
            continue

        raw_val = raw.get("value")
        if isinstance(raw_val, (int, float, bool, dict, list)):
            got_value = raw_val
            got_text = json.dumps(raw_val)
        elif isinstance(raw_val, str):
            try:
                got_value = json.loads(raw_val)
                got_text = raw_val
            except (TypeError, ValueError):
                got_value = raw_val
                got_text = json.dumps(raw_val)
        else:
            got_value = None
            got_text = "null"

        ok = values_equal(got_value, test.expected)
        if ok:
            passed += 1
        cases.append(
            CaseResult(index=index, passed=ok, got=None if ok else _short(got_text))
        )

    return RunResult(tests=cases, passed=passed, total=len(room.tests))


def run_tests(
    code: str,
    room: Room,
    language: str = "javascript",
    node_binary: str = "node",
) -> RunResult:
    """Execute code in the requested language against hidden room test cases."""
    lang = language.strip().lower()

    if lang in ("python", "py"):
        from app.services.runners.python_runner import run_python_tests
        return run_python_tests(code, room)

    if lang in ("cpp", "c++", "cplusplus"):
        from app.services.runners.cpp_runner import run_cpp_tests
        return run_cpp_tests(code, room)

    if lang in ("java",):
        from app.services.runners.java_runner import run_java_tests
        return run_java_tests(code, room)

    if lang in ("javascript", "js"):
        return run_js_tests(code, room, node_binary=node_binary)

    return _fatal(room, f"Unsupported language '{language}'. Supported: JavaScript, Python, C++, Java.")
