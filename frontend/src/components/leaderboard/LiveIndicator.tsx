import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";

export interface LiveIndicatorProps {
  updatedAt?: string | null;
  className?: string;
}

export function LiveIndicator({ updatedAt, className }: LiveIndicatorProps) {
  const [, setTick] = useState(0);

  // Force tick every second to keep "updated Xs ago" live
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-elevated/80 px-3 py-1 font-mono text-xs text-muted shadow-sm",
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="font-bold text-accent">LIVE</span>
      <span className="text-faint">·</span>
      <span className="text-muted">updated {relativeTime(updatedAt ?? null)}</span>
    </div>
  );
}
