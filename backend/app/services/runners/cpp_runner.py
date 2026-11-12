"""C++ code execution runner for contest rooms.

Compiles user C++ code with g++ and runs the resulting binary in an isolated sandbox.
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from app.content.rooms import Room, TestCase
from app.services.code_runner import compare_results
from app.services.js_runner import (
    MAX_CODE_LENGTH,
    RunResult,
    _fatal,
)

COMPILE_TIMEOUT_SECONDS = 7
EXEC_TIMEOUT_SECONDS = 3


def _cpp_arg_literal(arg) -> str:
    """Format a Python test argument into a valid C++ literal."""
    if isinstance(arg, bool):
        return "true" if arg else "false"
    if isinstance(arg, int):
        return str(arg)
    if isinstance(arg, str):
        return json.dumps(arg)
    if isinstance(arg, list):
        if not arg:
            return "{}"
        if isinstance(arg[0], int):
            return "std::vector<int>{" + ", ".join(str(x) for x in arg) + "}"
        if isinstance(arg[0], str):
            return "std::vector<std::string>{" + ", ".join(json.dumps(x) for x in arg) + "}"
        return "{" + ", ".join(_cpp_arg_literal(x) for x in arg) + "}"
    if isinstance(arg, dict):
        entries = []
        for k, v in arg.items():
            k_str = json.dumps(k)
            v_str = "{" + ", ".join(json.dumps(item) for item in v) + "}"
            entries.append(f"{{{k_str}, {v_str}}}")
        return "std::map<std::string, std::vector<std::string>>{" + ", ".join(entries) + "}"
    return json.dumps(arg)


def _generate_cpp_source(code: str, room: Room) -> str:
    entrypoint = room.entrypoints.get("cpp", room.entrypoint)

    lines = [
        "#include <iostream>",
        "#include <vector>",
        "#include <string>",
        "#include <map>",
        "#include <set>",
        "#include <queue>",
        "#include <stack>",
        "#include <algorithm>",
        "#include <sstream>",
        "#include <stdexcept>",
        "",
        "// === USER CODE START ===",
        code,
        "// === USER CODE END ===",
        "",
        "int main() {",
        '    std::cout << "{\\"results\\":[";',
    ]

    for idx, test in enumerate(room.tests):
        args_str = ", ".join(_cpp_arg_literal(a) for a in test.args)
        is_string_return = isinstance(test.expected, str)

        prefix = "," if idx > 0 else ""
        lines.append("    try {")
        lines.append(f"        auto res = {entrypoint}({args_str});")
        if is_string_return:
            lines.append(f'        std::cout << "{prefix}{{\\"ok\\":true,\\"value\\":\\"" << res << "\\"}}\";')
        else:
            lines.append(f'        std::cout << "{prefix}{{\\"ok\\":true,\\"value\\":" << res << "}}\";')
        lines.append("    } catch (const std::exception& e) {")
        lines.append(f'        std::cout << "{prefix}{{\\"ok\\":false,\\"error\\":\\"" << e.what() << "\\"}}\";')
        lines.append("    } catch (...) {")
        lines.append(f'        std::cout << "{prefix}{{\\"ok\\":false,\\"error\\":\\"Unknown runtime exception\\"}}\";')
        lines.append("    }")

    lines.append('    std::cout << "]}" << std::endl;')
    lines.append("    return 0;")
    lines.append("}")

    return "\n".join(lines)


def _run_cpp_cloud(source: str, room: Room) -> RunResult:
    """Cloud fallback runner when g++ is not installed on the server (e.g. Vercel serverless)."""
    import httpx
    from app.config import get_settings

    settings = get_settings()
    judge0_base = (settings.judge0_url or "https://ce.judge0.com").rstrip("/")
    headers = {}
    if settings.judge0_api_key:
        headers["X-RapidAPI-Key"] = settings.judge0_api_key
        headers["X-RapidAPI-Host"] = judge0_base.replace("https://", "").replace("http://", "")

    # Primary cloud runner: Judge0
    try:
        payload = {"source_code": source, "language_id": 105}  # C++ (GCC 14.1.0)
        res = httpx.post(
            f"{judge0_base}/submissions?wait=true",
            json=payload,
            headers=headers,
            timeout=12.0,
        )
        if res.status_code == 200:
            data = res.json()
            compile_output = data.get("compile_output")
            if compile_output:
                lines = compile_output.strip().splitlines()[:10]
                return _fatal(room, "Compilation error:\n" + "\n".join(lines))

            status_id = data.get("status", {}).get("id")
            if status_id == 5:
                return _fatal(room, "Your code took too long and was stopped (timeout).")
            if status_id not in (3, None):
                err = data.get("stderr") or data.get("message") or "Runtime error"
                return _fatal(room, f"Program error: {err[:200]}")

            stdout = data.get("stdout") or ""
            if not stdout.strip():
                return _fatal(room, "Program produced no output.")
            answer = json.loads(stdout.strip().splitlines()[-1])
            return compare_results(room, answer.get("results", []))
    except Exception:
        pass

    # Secondary cloud runner: Wandbox
    try:
        payload = {"code": source, "compiler": "gcc-head"}
        res = httpx.post("https://wandbox.org/api/compile.json", json=payload, timeout=12.0)
        if res.status_code == 200:
            data = res.json()
            comp_err = data.get("compiler_error")
            if comp_err and data.get("status") != "0":
                lines = comp_err.strip().splitlines()[:10]
                return _fatal(room, "Compilation error:\n" + "\n".join(lines))
            stdout = data.get("program_output") or ""
            if stdout.strip():
                answer = json.loads(stdout.strip().splitlines()[-1])
                return compare_results(room, answer.get("results", []))
    except Exception:
        pass

    return _fatal(
        room,
        "C++ compiler (g++) is not available on this server and cloud compiler could not be reached.",
    )


def run_cpp_tests(code: str, room: Room, compiler_binary: str = "g++") -> RunResult:
    if len(code) > MAX_CODE_LENGTH:
        return _fatal(room, "Your code is too long.")

    source = _generate_cpp_source(code, room)

    with tempfile.TemporaryDirectory() as tmpdir:
        src_file = Path(tmpdir) / "solution.cpp"
        exe_file = Path(tmpdir) / ("solution.exe" if os.name == "nt" else "solution")

        src_file.write_text(source, encoding="utf-8")

        # 1. Compile locally
        try:
            compile_proc = subprocess.run(
                [compiler_binary, "-O2", "-std=c++17", str(src_file), "-o", str(exe_file)],
                capture_output=True,
                text=True,
                timeout=COMPILE_TIMEOUT_SECONDS,
                check=False,
            )
        except FileNotFoundError:
            # If g++ is missing on the server (e.g. Vercel), fall back to cloud execution
            return _run_cpp_cloud(source, room)
        except subprocess.TimeoutExpired:
            return _fatal(room, "Compilation took too long.")

        if compile_proc.returncode != 0:
            err = compile_proc.stderr.strip()
            # Clean up temp file paths in error message
            err = err.replace(str(src_file), "solution.cpp")
            lines = err.splitlines()[:10]  # First 10 lines of errors
            return _fatal(room, "Compilation error:\n" + "\n".join(lines))

        # 2. Execute
        try:
            run_proc = subprocess.run(
                [str(exe_file)],
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return _fatal(room, "Your code took too long and was stopped (timeout).")

        if run_proc.returncode != 0 and not run_proc.stdout.strip():
            return _fatal(room, f"Program crashed with exit code {run_proc.returncode}.")

        try:
            answer = json.loads(run_proc.stdout.strip().splitlines()[-1])
        except (ValueError, IndexError):
            return _fatal(room, "The C++ runner returned something unreadable.")

        return compare_results(room, answer.get("results", []))
