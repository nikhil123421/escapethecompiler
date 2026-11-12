"""The sandbox. These tests actually execute JavaScript through Node."""

import time

from app.content.rooms import ROOMS_BY_ID
from app.services.js_runner import run_tests, values_equal

STACK = ROOMS_BY_ID["stack"]

CORRECT = """
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
"""


def test_correct_solution_passes_every_test():
    result = run_tests(CORRECT, STACK)
    assert result.fatal is None
    assert result.total == len(STACK.tests)
    assert result.all_passed


def test_wrong_answer_reports_what_it_got_but_not_the_answer():
    # Returns 0 for every input.
    result = run_tests("function evalPostfix() { return 0; }", STACK)
    assert not result.all_passed
    assert result.passed == 0
    first = result.tests[0]
    assert first.passed is False
    assert first.got == "0"
    # The expected value (9) must never be sent to the client.
    assert "9" not in (first.got or "")


def test_syntax_error_is_reported_as_fatal():
    result = run_tests("function evalPostfix( {", STACK)
    assert result.fatal is not None
    assert "Unexpected" in result.fatal or "expected" in result.fatal.lower()


def test_missing_function():
    result = run_tests("function somethingElse() { return 1; }", STACK)
    assert result.fatal is not None
    assert "evalPostfix" in result.fatal


def test_infinite_loop_is_stopped_quickly():
    started = time.monotonic()
    result = run_tests("function evalPostfix() { while (true) {} }", STACK)
    elapsed = time.monotonic() - started

    assert not result.all_passed
    assert any(case.error for case in result.tests)
    assert elapsed < 8, "the sandbox must kill runaway code"


def test_eval_is_blocked_inside_the_sandbox():
    result = run_tests("function evalPostfix() { return eval('1 + 1'); }", STACK)
    assert not result.all_passed
    assert any(case.error for case in result.tests)


def test_values_equal_is_type_strict_for_booleans():
    assert values_equal(9, 9)
    assert values_equal(9.0, 9)
    assert not values_equal(True, 1)
    assert not values_equal("9", 9)
