import { Clock } from "lucide-react";

import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";

export interface TimerPillProps {
  label: string;
  deadline: string | null | undefined;
  serverTime: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}

export function TimerPill({
  label,
  deadline,
  serverTime,
  className,
  size = "md",
}: TimerPillProps) {
  const remaining = useCountdown(deadline, serverTime);

  let tone = "border-line bg-elevated text-ink";
  let digitColor = "text-accent";

  if (remaining !== null) {
    if (remaining === 0) {
      tone = "border-danger/30 bg-danger/10 text-danger";
      digitColor = "text-danger";
    } else if (remaining <= 60) {
      tone = "border-danger/40 bg-danger/15 text-danger animate-pulse";
      digitColor = "text-danger";
    } else if (remaining <= 180) {
      tone = "border-warn/40 bg-warn/10 text-warn";
      digitColor = "text-warn";
    }
  }

  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 transition-colors",
        isSmall ? "h-8 text-xs" : "h-10 text-sm",
        tone,
        className,
      )}
    >
      <Clock size={isSmall ? 13 : 15} className="shrink-0 text-faint" />
      <span className="mono-label text-[10px] text-muted">{label}</span>
      <span className={cn("timer-digits font-mono font-bold tracking-wider", digitColor)}>
        {formatClock(remaining)}
      </span>
    </div>
  );
}
