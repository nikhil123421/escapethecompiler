import { AlertTriangle, CheckCircle2, Terminal, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { RunResult } from "@/types/api";

export interface TestResultsProps {
  result: RunResult | null;
  className?: string;
}

export function TestResults({ result, className }: TestResultsProps) {
  if (!result) {
    return (
      <div
        className={cn(
          "panel flex flex-col items-center justify-center p-6 text-center font-mono text-xs text-faint",
          className,
        )}
      >
        <Terminal size={18} className="mb-2 text-muted" />
        <p>Run tests to verify your implementation.</p>
      </div>
    );
  }

  const allPassed = result.passed === result.total && !result.fatal;

  return (
    <div className={cn("panel overflow-hidden border-line", className)}>
      {/* Header bar */}
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-2.5 font-mono text-xs",
          allPassed
            ? "border-success/30 bg-success/10 text-success"
            : result.fatal
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-warn/30 bg-warn/10 text-warn",
        )}
      >
        <div className="flex items-center gap-2 font-bold">
          {allPassed ? (
            <>
              <CheckCircle2 size={16} />
              <span>ALL TESTS PASSED ({result.passed}/{result.total})</span>
            </>
          ) : result.fatal ? (
            <>
              <AlertTriangle size={16} />
              <span>EVALUATION FAILED</span>
            </>
          ) : (
            <>
              <XCircle size={16} />
              <span>FAILED ({result.passed}/{result.total} PASSED)</span>
            </>
          )}
        </div>
        <span className="text-[11px] opacity-80">
          {allPassed ? "Room solved!" : "Revise code & re-run"}
        </span>
      </div>

      {/* Fatal error banner */}
      {result.fatal && (
        <div className="border-b border-danger/20 bg-danger/5 p-4 font-mono text-xs text-danger">
          <p className="font-bold">Error:</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{result.fatal}</pre>
        </div>
      )}

      {/* Test cases list */}
      <div className="divide-y divide-line/60 bg-surface">
        {result.cases.map((testCase) => (
          <div
            key={testCase.index}
            className="flex flex-col gap-1.5 p-3.5 transition-colors hover:bg-elevated/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2.5">
              {testCase.passed ? (
                <CheckCircle2 size={16} className="text-success shrink-0" />
              ) : (
                <XCircle size={16} className="text-danger shrink-0" />
              )}
              <span className="font-mono text-xs font-medium text-ink">
                Test Case #{testCase.index}
              </span>
              <Badge variant={testCase.passed ? "success" : "danger"}>
                {testCase.passed ? "PASS" : "FAIL"}
              </Badge>
            </div>

            {/* Error or got detail */}
            {!testCase.passed && (
              <div className="font-mono text-xs sm:text-right">
                {testCase.error ? (
                  <span className="text-danger">{testCase.error}</span>
                ) : testCase.got !== null ? (
                  <span className="text-muted">
                    Output: <code className="text-danger">{testCase.got}</code>
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
