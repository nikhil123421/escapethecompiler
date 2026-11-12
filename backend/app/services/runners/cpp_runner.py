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


def run_cpp_tests(code: str, room: Room, compiler_binary: str = "g++") -> RunResult:
    if len(code) > MAX_CODE_LENGTH:
        return _fatal(room, "Your code is too long.")

    source = _generate_cpp_source(code, room)

    with tempfile.TemporaryDirectory() as tmpdir:
        src_file = Path(tmpdir) / "solution.cpp"
        exe_file = Path(tmpdir) / ("solution.exe" if os.name == "nt" else "solution")

        src_file.write_text(source, encoding="utf-8")

        # 1. Compile
        try:
            compile_proc = subprocess.run(
                [compiler_binary, "-O2", "-std=c++17", str(src_file), "-o", str(exe_file)],
                capture_output=True,
                text=True,
                timeout=COMPILE_TIMEOUT_SECONDS,
                check=False,
            )
        except FileNotFoundError:
            return _fatal(room, "C++ compiler (g++) is not available on this system.")
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
