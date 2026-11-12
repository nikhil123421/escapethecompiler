import { HelpCircle, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SupportedLanguage } from "@/types/api";

export interface RunBarProps {
  onRun: () => void;
  isRunning: boolean;
  isRateLimited: boolean;
  cooldownMs: number;
  onHint: () => void;
  hintsAvailable: number;
  hintsUsed: number;
  isTakingHint: boolean;
  onResetStarter: () => void;
  disabled?: boolean;
  language?: SupportedLanguage;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export function RunBar({
  onRun,
  isRunning,
  isRateLimited,
  cooldownMs,
  onHint,
  hintsAvailable,
  hintsUsed,
  isTakingHint,
  onResetStarter,
  disabled = false,
  language,
  onLanguageChange,
}: RunBarProps) {
  const cooldownSec = (cooldownMs / 1000).toFixed(1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-line bg-surface/90 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Run Tests Button */}
        <Button
          variant="primary"
          onClick={onRun}
          disabled={disabled || isRunning || isRateLimited}
          className="min-w-[130px]"
        >
          <Play size={15} />
          {isRunning
            ? "Evaluating…"
            : isRateLimited
              ? `Wait (${cooldownSec}s)`
              : "Run tests"}
        </Button>

        {/* Language Selector */}
        {language && onLanguageChange && (
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            disabled={disabled || isRunning}
            aria-label="Programming language"
            className="rounded-lg border border-line bg-elevated px-2.5 py-1.5 font-mono text-xs text-ink focus:border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++17</option>
            <option value="java">Java</option>
          </select>
        )}

        {/* Hint Button */}
        <Button
          variant="secondary"
          onClick={() => {
            if (hintsAvailable <= 0) return;
            if (
              window.confirm(
                `Using a hint will deduct 20 points from your total score. Continue? (${hintsUsed}/3 used)`,
              )
            ) {
              onHint();
            }
          }}
          disabled={disabled || hintsAvailable <= 0 || isTakingHint}
          className="text-xs"
        >
          <HelpCircle size={14} className="text-warn" />
          <span>Hint (-20 pts)</span>
          <span className="font-mono text-[11px] text-faint">
            ({hintsAvailable} left)
          </span>
        </Button>
      </div>

      {/* Reset Code */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (
            window.confirm(
              "Reset your editor code to the default starter template for this language?",
            )
          ) {
            onResetStarter();
          }
        }}
        disabled={disabled || isRunning}
        className="text-muted hover:text-ink text-xs"
      >
        <RotateCcw size={13} />
        <span>Reset starter</span>
      </Button>
    </div>
  );
}
