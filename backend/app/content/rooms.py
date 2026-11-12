"""The five rooms, as data.

This file is the single source of truth for puzzle content. It lives in the
backend on purpose: the browser only ever receives the parts a player is
allowed to see (see schemas.RoomPublic).
"""

from dataclasses import dataclass, field
from typing import Any

FINAL_CODE = "9463"
FINAL_WORD = "REBOOT"


@dataclass(frozen=True)
class TestCase:
    """One hidden test: call the player's function with `args`, expect `expected`."""

    args: list[Any]
    expected: Any


@dataclass(frozen=True)
class Room:
    id: str
    number: int
    title: str
    topic: str
    prompt: str
    starter_code: str
    entrypoint: str
    tests: tuple[TestCase, ...]
    hints: tuple[str, ...]
    code_piece: str
    starter_codes: dict[str, str] = field(default_factory=dict)
    entrypoints: dict[str, str] = field(default_factory=dict)


ROOMS: tuple[Room, ...] = (
    Room(
        id="stack",
        number=1,
        title="Stack Room",
        topic="Stack",
        prompt=(
            "Complete evalPostfix(tokens). It receives an array like "
            '["5","2","3","*","+","2","-"] and returns the numeric result. '
            "Numbers are pushed on a stack; for an operator, pop two values and "
            "push the result. Supported operators: + - * /"
        ),
        starter_code=(
            "function evalPostfix(tokens) {\n"
            "  const stack = [];\n"
            "  // your code here\n"
            "  return stack.pop();\n"
            "}"
        ),
        entrypoint="evalPostfix",
        starter_codes={
            "javascript": (
                "function evalPostfix(tokens) {\n"
                "  const stack = [];\n"
                "  // your code here\n"
                "  return stack.pop();\n"
                "}"
            ),
            "python": (
                "def eval_postfix(tokens: list[str]) -> int:\n"
                "    stack = []\n"
                "    # your code here\n"
                "    return stack.pop() if stack else 0\n"
            ),
            "cpp": (
                "#include <vector>\n"
                "#include <string>\n\n"
                "int evalPostfix(const std::vector<std::string>& tokens) {\n"
                "    std::vector<int> stack;\n"
                "    // your code here\n"
                "    return stack.empty() ? 0 : stack.back();\n"
                "}\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public int evalPostfix(List<String> tokens) {\n"
                "        Stack<Integer> stack = new Stack<>();\n"
                "        // your code here\n"
                "        return stack.isEmpty() ? 0 : stack.pop();\n"
                "    }\n"
                "}\n"
            ),
        },
        entrypoints={
            "javascript": "evalPostfix",
            "python": "eval_postfix",
            "cpp": "evalPostfix",
            "java": "evalPostfix",
        },
        tests=(
            TestCase(args=[["5", "2", "3", "*", "+", "2", "-"]], expected=9),
            TestCase(args=[["4", "2", "/", "3", "+"]], expected=5),
            TestCase(args=[["2", "3", "1", "*", "+", "9", "-"]], expected=-4),
        ),
        hints=(
            "Numbers are pushed. For an operator, pop two values.",
            "Pop b first, then a, and compute a op b.",
            "Switch on the token: if it is + - * / pop b, pop a and push the result; "
            "else push Number(token).",
        ),
        code_piece="9",
    ),
    Room(
        id="array",
        number=2,
        title="Array Room",
        topic="Binary search",
        prompt=(
            "Complete searchRotated(arr, target). The sorted array was rotated, "
            "for example [6,7,8,1,2,3,4,5]. Return the index of target, or -1 if it "
            "is not there. Aim for O(log n)."
        ),
        starter_code=(
            "function searchRotated(arr, target) {\n"
            "  let lo = 0, hi = arr.length - 1;\n"
            "  // your code here\n"
            "  return -1;\n"
            "}"
        ),
        entrypoint="searchRotated",
        starter_codes={
            "javascript": (
                "function searchRotated(arr, target) {\n"
                "  let lo = 0, hi = arr.length - 1;\n"
                "  // your code here\n"
                "  return -1;\n"
                "}"
            ),
            "python": (
                "def search_rotated(arr: list[int], target: int) -> int:\n"
                "    lo, hi = 0, len(arr) - 1\n"
                "    # your code here\n"
                "    return -1\n"
            ),
            "cpp": (
                "#include <vector>\n\n"
                "int searchRotated(const std::vector<int>& arr, int target) {\n"
                "    int lo = 0, hi = static_cast<int>(arr.size()) - 1;\n"
                "    // your code here\n"
                "    return -1;\n"
                "}\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public int searchRotated(List<Integer> arr, int target) {\n"
                "        int lo = 0, hi = arr.size() - 1;\n"
                "        // your code here\n"
                "        return -1;\n"
                "    }\n"
                "}\n"
            ),
        },
        entrypoints={
            "javascript": "searchRotated",
            "python": "search_rotated",
            "cpp": "searchRotated",
            "java": "searchRotated",
        },
        tests=(
            TestCase(args=[[6, 7, 8, 1, 2, 3, 4, 5], 2], expected=4),
            TestCase(args=[[4, 5, 6, 7, 0, 1, 2], 0], expected=4),
            TestCase(args=[[1], 1], expected=0),
            TestCase(args=[[3, 1], 5], expected=-1),
        ),
        hints=(
            "Even in a rotated array, one half around mid is always sorted.",
            "Check if arr[lo] <= arr[mid]: then the left half is sorted.",
            "If target lies inside the sorted half, move into it; otherwise move to "
            "the other half.",
        ),
        code_piece="4",
    ),
    Room(
        id="graph",
        number=3,
        title="Graph Room",
        topic="BFS",
        prompt=(
            "Complete bfs(graph, start). graph is an object of neighbour lists, "
            'already in alphabetical order, e.g. {A:["B","C"], ...}. Return the '
            'visit order as one string, e.g. "ABCDEF".'
        ),
        starter_code=(
            "function bfs(graph, start) {\n"
            "  const visited = {};\n"
            "  const queue = [start];\n"
            "  let order = \"\";\n"
            "  // your code here\n"
            "  return order;\n"
            "}"
        ),
        entrypoint="bfs",
        starter_codes={
            "javascript": (
                "function bfs(graph, start) {\n"
                "  const visited = {};\n"
                "  const queue = [start];\n"
                "  let order = \"\";\n"
                "  // your code here\n"
                "  return order;\n"
                "}"
            ),
            "python": (
                "def bfs(graph: dict[str, list[str]], start: str) -> str:\n"
                "    visited = set()\n"
                "    queue = [start]\n"
                "    order = \"\"\n"
                "    # your code here\n"
                "    return order\n"
            ),
            "cpp": (
                "#include <string>\n"
                "#include <vector>\n"
                "#include <map>\n\n"
                "std::string bfs(const std::map<std::string, std::vector<std::string>>& graph, const std::string& start) {\n"
                "    std::string order = \"\";\n"
                "    // your code here\n"
                "    return order;\n"
                "}\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public String bfs(Map<String, List<String>> graph, String start) {\n"
                "        StringBuilder order = new StringBuilder();\n"
                "        // your code here\n"
                "        return order.toString();\n"
                "    }\n"
                "}\n"
            ),
        },
        entrypoints={
            "javascript": "bfs",
            "python": "bfs",
            "cpp": "bfs",
            "java": "bfs",
        },
        tests=(
            TestCase(
                args=[
                    {
                        "A": ["B", "C"],
                        "B": ["A", "D"],
                        "C": ["A", "D", "E"],
                        "D": ["B", "C", "F"],
                        "E": ["C", "F"],
                        "F": ["D", "E"],
                    },
                    "A",
                ],
                expected="ABCDEF",
            ),
            TestCase(
                args=[{"X": ["Y"], "Y": ["X", "Z"], "Z": ["Y"]}, "Y"],
                expected="YXZ",
            ),
        ),
        hints=(
            "BFS uses a queue: take from the front, add neighbours to the back.",
            "Mark a node visited when you add it, so it is never added twice.",
            "while queue is not empty: node = queue.shift(); order += node; push "
            "unvisited neighbours.",
        ),
        code_piece="6",
    ),
    Room(
        id="debug",
        number=4,
        title="Debug Room",
        topic="Debugging",
        prompt=(
            "This function should return the sum of an array, but it is broken. "
            "Fix the bug so that every test passes."
        ),
        starter_code=(
            "function sumArray(arr) {\n"
            "  let sum = 0;\n"
            "  for (let i = 0; i <= arr.length; i++) {\n"
            "    sum = sum + arr[i];\n"
            "  }\n"
            "  return sum;\n"
            "}"
        ),
        entrypoint="sumArray",
        starter_codes={
            "javascript": (
                "function sumArray(arr) {\n"
                "  let sum = 0;\n"
                "  for (let i = 0; i <= arr.length; i++) {\n"
                "    sum = sum + arr[i];\n"
                "  }\n"
                "  return sum;\n"
                "}"
            ),
            "python": (
                "def sum_array(arr: list[int]) -> int:\n"
                "    total = 0\n"
                "    # Fix the bug:\n"
                "    for i in range(len(arr) + 1):\n"
                "        total += arr[i]\n"
                "    return total\n"
            ),
            "cpp": (
                "#include <vector>\n\n"
                "int sumArray(const std::vector<int>& arr) {\n"
                "    int sum = 0;\n"
                "    // Fix the bug:\n"
                "    for (size_t i = 0; i <= arr.size(); ++i) {\n"
                "        sum += arr[i];\n"
                "    }\n"
                "    return sum;\n"
                "}\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public int sumArray(List<Integer> arr) {\n"
                "        int sum = 0;\n"
                "        // Fix the bug:\n"
                "        for (int i = 0; i <= arr.size(); i++) {\n"
                "            sum += arr.get(i);\n"
                "        }\n"
                "        return sum;\n"
                "    }\n"
                "}\n"
            ),
        },
        entrypoints={
            "javascript": "sumArray",
            "python": "sum_array",
            "cpp": "sumArray",
            "java": "sumArray",
        },
        tests=(
            TestCase(args=[[1, 2, 3, 4, 5]], expected=15),
            TestCase(args=[[]], expected=0),
            TestCase(args=[[10]], expected=10),
        ),
        hints=(
            "The bug is in the for loop line.",
            "The last valid index of an array is length - 1.",
            "Change <= to < in the loop condition.",
        ),
        code_piece="3",
    ),
    Room(
        id="cipher",
        number=5,
        title="Cipher Room",
        topic="Logic",
        prompt=(
            "Complete caesarDecode(text, shift). Each letter was shifted forward by "
            "shift, so move it back, wrapping around the alphabet. Uppercase letters "
            "only. The decoded word is the final password."
        ),
        starter_code=(
            "function caesarDecode(text, shift) {\n"
            "  let out = \"\";\n"
            "  // your code here\n"
            "  return out;\n"
            "}"
        ),
        entrypoint="caesarDecode",
        starter_codes={
            "javascript": (
                "function caesarDecode(text, shift) {\n"
                "  let out = \"\";\n"
                "  // your code here\n"
                "  return out;\n"
                "}"
            ),
            "python": (
                "def caesar_decode(text: str, shift: int) -> str:\n"
                "    out = \"\"\n"
                "    # your code here\n"
                "    return out\n"
            ),
            "cpp": (
                "#include <string>\n\n"
                "std::string caesarDecode(const std::string& text, int shift) {\n"
                "    std::string out = \"\";\n"
                "    // your code here\n"
                "    return out;\n"
                "}\n"
            ),
            "java": (
                "import java.util.*;\n\n"
                "public class Solution {\n"
                "    public String caesarDecode(String text, int shift) {\n"
                "        StringBuilder out = new StringBuilder();\n"
                "        // your code here\n"
                "        return out.toString();\n"
                "    }\n"
                "}\n"
            ),
        },
        entrypoints={
            "javascript": "caesarDecode",
            "python": "caesar_decode",
            "cpp": "caesarDecode",
            "java": "caesarDecode",
        },
        tests=(
            TestCase(args=["UHERRW", 3], expected="REBOOT"),
            TestCase(args=["KHOOR", 3], expected="HELLO"),
            TestCase(args=["ABC", 1], expected="ZAB"),
        ),
        hints=(
            "Use charCodeAt and String.fromCharCode in JS, or ord/chr in Python. 'A' is 65.",
            "Convert: (code - 65 - shift + 26) % 26 + 65.",
            "Loop over text, apply the formula to each letter and append to out.",
        ),
        code_piece="REBOOT",
    ),
)

ROOMS_BY_ID: dict[str, Room] = {room.id: room for room in ROOMS}


def get_room(room_id: str) -> Room:
    room = ROOMS_BY_ID.get(room_id)
    if room is None:
        from app.errors import ApiError

        raise ApiError("unknown_room", f"There is no room called '{room_id}'.", status=404)
    return room
