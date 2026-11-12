'use strict';

// Runs one player submission and prints a JSON answer.
//
// The player's code never shares a scope with this file: it is evaluated in a
// fresh vm context that has standard builtins but no require, no process and
// no filesystem. `codeGeneration.strings: false` stops it from building new
// code with eval() or the Function constructor.

const vm = require('node:vm');

const CONTEXT_TIMEOUT_MS = 1000;
const CALL_TIMEOUT_MS = 1500;

function describe(error) {
  if (!error) return 'Failed.';
  if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
    return 'Your code ran too long (possible infinite loop).';
  }
  const message = error.message || String(error);
  return String(message).slice(0, 160);
}

function run(payload) {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
  });

  try {
    new vm.Script(payload.code, { filename: 'player.js' }).runInContext(context, {
      timeout: CONTEXT_TIMEOUT_MS,
    });
  } catch (error) {
    return { fatal: describe(error) };
  }

  let isFunction = false;
  try {
    isFunction = new vm.Script(`typeof (${payload.entrypoint}) === 'function'`).runInContext(
      context,
      { timeout: 500 },
    );
  } catch (error) {
    return { fatal: describe(error) };
  }

  if (!isFunction) {
    return { fatal: `Function ${payload.entrypoint} was not found.` };
  }

  const results = [];
  for (const call of payload.calls) {
    const source = `JSON.stringify((${payload.entrypoint}).apply(null, ${call.args}))`;
    try {
      const value = new vm.Script(source).runInContext(context, { timeout: CALL_TIMEOUT_MS });
      results.push({ ok: true, value: value === undefined ? 'null' : value });
    } catch (error) {
      results.push({ ok: false, error: describe(error) });
    }
  }

  return { results };
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  let answer;
  try {
    answer = run(JSON.parse(input));
  } catch (error) {
    answer = { fatal: describe(error) };
  }
  process.stdout.write(JSON.stringify(answer));
});
