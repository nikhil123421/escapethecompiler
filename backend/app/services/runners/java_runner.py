"""Java code execution runner for contest rooms.

Compiles user Java code with javac and runs the resulting bytecode in an isolated JVM.
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from app.content.rooms import Room
from app.services.code_runner import compare_results
from app.services.js_runner import (
    MAX_CODE_LENGTH,
    RunResult,
    _fatal,
)

COMPILE_TIMEOUT_SECONDS = 8
EXEC_TIMEOUT_SECONDS = 4


def _java_arg_literal(arg) -> str:
    """Format a Python test argument into a valid Java expression."""
    if isinstance(arg, bool):
        return "true" if arg else "false"
    if isinstance(arg, int):
        return str(arg)
    if isinstance(arg, str):
        return json.dumps(arg)
    if isinstance(arg, list):
        if not arg:
            return "new ArrayList<>()"
        if isinstance(arg[0], int):
            return "Arrays.asList(" + ", ".join(str(x) for x in arg) + ")"
        if isinstance(arg[0], str):
            return "Arrays.asList(" + ", ".join(json.dumps(x) for x in arg) + ")"
        return "Arrays.asList(" + ", ".join(_java_arg_literal(x) for x in arg) + ")"
    if isinstance(arg, dict):
        pairs = []
        for k, v in arg.items():
            k_expr = json.dumps(k)
            v_expr = "Arrays.asList(" + ", ".join(json.dumps(item) for item in v) + ")"
            pairs.append(f"{k_expr}, {v_expr}")
        return "mapOf(" + ", ".join(pairs) + ")"
    return json.dumps(arg)


def _generate_runner_source(room: Room) -> str:
    entrypoint = room.entrypoints.get("java", room.entrypoint)

    lines = [
        "import java.util.*;",
        "",
        "public class Runner {",
        "    @SuppressWarnings(\"unchecked\")",
        "    private static <T> Map<String, T> mapOf(Object... kvs) {",
        "        Map<String, T> map = new LinkedHashMap<>();",
        "        for (int i = 0; i < kvs.length; i += 2) {",
        "            map.put((String) kvs[i], (T) kvs[i + 1]);",
        "        }",
        "        return map;",
        "    }",
        "",
        "    private static void printError(String prefix, Exception e) {",
        "        String msg = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage().replace(\"\\\"\", \"\");",
        "        System.out.print(prefix + \"{\\\"ok\\\":false,\\\"error\\\":\\\"\" + msg + \"\\\"}\");",
        "    }",
        "",
        "    public static void main(String[] args) {",
        "        Solution sol = new Solution();",
        '        System.out.print("{\\"results\\":[");',
    ]

    for idx, test in enumerate(room.tests):
        args_str = ", ".join(_java_arg_literal(a) for a in test.args)
        is_string_return = isinstance(test.expected, str)

        prefix = "," if idx > 0 else ""
        lines.append("        try {")
        lines.append(f"            Object res = sol.{entrypoint}({args_str});")
        if is_string_return:
            lines.append(f'            System.out.print("{prefix}{{\\"ok\\":true,\\"value\\":\\"" + res + "\\"}}\");')
        else:
            lines.append(f'            System.out.print("{prefix}{{\\"ok\\":true,\\"value\\":" + res + "}}\");')
        lines.append("        } catch (Exception e) {")
        lines.append(f'            printError("{prefix}", e);')
        lines.append("        }")

    lines.append('        System.out.println("]}");')
    lines.append("    }")
    lines.append("}")

    return "\n".join(lines)


def _run_java_cloud(code: str, room: Room) -> RunResult:
    """Cloud fallback runner when javac is not installed on the server (e.g. Vercel serverless)."""
    import httpx
    from app.config import get_settings

    settings = get_settings()
    judge0_base = (settings.judge0_url or "https://ce.judge0.com").rstrip("/")
    headers = {}
    if settings.judge0_api_key:
        headers["X-RapidAPI-Key"] = settings.judge0_api_key
        headers["X-RapidAPI-Host"] = judge0_base.replace("https://", "").replace("http://", "")

    # Prepare single-file Java harness: Main (with main()) + Solution
    clean_user = code.replace("public class Solution", "class Solution").replace("import java.util.*;", "")
    runner = _generate_runner_source(room).replace("public class Runner", "public class Main").replace("import java.util.*;", "")
    combined = "import java.util.*;\n\n" + runner + "\n\n" + clean_user

    try:
        payload = {"source_code": combined, "language_id": 91}  # Java (JDK 17)
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

    return _fatal(
        room,
        "Java compiler (javac) is not available on this server and cloud compiler could not be reached.",
    )


def run_java_tests(
    code: str, room: Room, javac_binary: str = "javac", java_binary: str = "java"
) -> RunResult:
    if len(code) > MAX_CODE_LENGTH:
        return _fatal(room, "Your code is too long.")

    clean_code = code.strip()
    if "class Solution" not in clean_code:
        solution_source = f"import java.util.*;\n\npublic class Solution {{\n{clean_code}\n}}"
    else:
        solution_source = clean_code

    runner_source = _generate_runner_source(room)

    with tempfile.TemporaryDirectory() as tmpdir:
        sol_file = Path(tmpdir) / "Solution.java"
        runner_file = Path(tmpdir) / "Runner.java"

        sol_file.write_text(solution_source, encoding="utf-8")
        runner_file.write_text(runner_source, encoding="utf-8")

        # 1. Compile
        try:
            compile_proc = subprocess.run(
                [javac_binary, "-encoding", "UTF-8", str(sol_file), str(runner_file)],
                capture_output=True,
                text=True,
                timeout=COMPILE_TIMEOUT_SECONDS,
                cwd=tmpdir,
                check=False,
            )
        except FileNotFoundError:
            # If javac is missing on the server (e.g. Vercel), fall back to cloud execution
            return _run_java_cloud(solution_source, room)
        except subprocess.TimeoutExpired:
            return _fatal(room, "Java compilation took too long.")

        if compile_proc.returncode != 0:
            err = compile_proc.stderr.strip()
            err = err.replace(str(sol_file), "Solution.java").replace(str(runner_file), "Runner.java")
            lines = err.splitlines()[:10]
            return _fatal(room, "Compilation error:\n" + "\n".join(lines))

        # 2. Run
        try:
            run_proc = subprocess.run(
                [java_binary, "-Xmx128m", "-Dfile.encoding=UTF-8", "Runner"],
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT_SECONDS,
                cwd=tmpdir,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return _fatal(room, "Your code took too long and was stopped (timeout).")

        if run_proc.returncode != 0 and not run_proc.stdout.strip():
            return _fatal(room, f"JVM crashed with exit code {run_proc.returncode}.")

        try:
            answer = json.loads(run_proc.stdout.strip().splitlines()[-1])
        except (ValueError, IndexError):
            return _fatal(room, "The Java runner returned something unreadable.")

        return compare_results(room, answer.get("results", []))
