"""Tests for Python, C++, and Java code runners."""

import pytest

from app.content.rooms import get_room
from app.services import code_runner


def test_python_runner_correct_solution():
    room = get_room("stack")
    code = """
def eval_postfix(tokens: list[str]) -> int:
    stack = []
    for t in tokens:
        if t in "+-*/":
            b = stack.pop()
            a = stack.pop()
            if t == "+": stack.append(a + b)
            elif t == "-": stack.append(a - b)
            elif t == "*": stack.append(a * b)
            elif t == "/": stack.append(int(a / b))
        else:
            stack.append(int(t))
    return stack[-1]
"""
    result = code_runner.run_tests(code, room, language="python")
    assert result.fatal is None
    assert result.all_passed
    assert result.passed == len(room.tests)


def test_python_runner_wrong_answer():
    room = get_room("stack")
    code = "def eval_postfix(tokens): return 9999"
    result = code_runner.run_tests(code, room, language="python")
    assert result.fatal is None
    assert not result.all_passed
    assert result.passed == 0


def test_python_runner_syntax_error():
    room = get_room("stack")
    code = "def eval_postfix(tokens): return 0 +"
    result = code_runner.run_tests(code, room, language="python")
    assert result.fatal is not None
    assert "Syntax" in result.fatal or "error" in result.fatal


def test_cpp_runner_correct_solution():
    room = get_room("debug")
    code = """
#include <vector>

int sumArray(const std::vector<int>& arr) {
    int sum = 0;
    for (size_t i = 0; i < arr.size(); ++i) {
        sum += arr[i];
    }
    return sum;
}
"""
    result = code_runner.run_tests(code, room, language="cpp")
    assert result.fatal is None
    assert result.all_passed
    assert result.passed == len(room.tests)


def test_cpp_runner_compilation_error():
    room = get_room("debug")
    code = "int sumArray(const std::vector<int>& arr) { return undefined_var; }"
    result = code_runner.run_tests(code, room, language="cpp")
    assert result.fatal is not None
    assert "Compilation error" in result.fatal


def test_java_runner_correct_solution():
    room = get_room("debug")
    code = """
import java.util.*;

public class Solution {
    public int sumArray(List<Integer> arr) {
        int sum = 0;
        for (int i = 0; i < arr.size(); i++) {
            sum += arr.get(i);
        }
        return sum;
    }
}
"""
    result = code_runner.run_tests(code, room, language="java")
    assert result.fatal is None
    assert result.all_passed
    assert result.passed == len(room.tests)


def test_java_runner_compilation_error():
    room = get_room("debug")
    code = "public class Solution { invalid java syntax }"
    result = code_runner.run_tests(code, room, language="java")
    assert result.fatal is not None
    assert "Compilation error" in result.fatal
