import { Crown, Medal } from "lucide-react";

import { cn } from "@/lib/cn";

export interface RankBadgeProps {
  rank: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RankBadge({ rank, className, size = "md" }: RankBadgeProps) {
  let tone = "border-line bg-surface text-faint";
  let Icon = null;

  if (rank === 1) {
    tone = "border-accent/40 bg-accent/15 text-accent shadow-[0_0_12px_rgba(200,247,81,0.25)]";
    Icon = Crown;
  } else if (rank === 2) {
    tone = "border-cyan/40 bg-cyan/15 text-cyan shadow-[0_0_12px_rgba(110,231,249,0.2)]";
    Icon = Medal;
  } else if (rank === 3) {
    tone = "border-warn/40 bg-warn/15 text-warn shadow-[0_0_12px_rgba(245,196,81,0.2)]";
    Icon = Medal;
  }

  const sizeClasses = {
    sm: "h-6 px-2 text-[11px]",
    md: "h-7 px-2.5 text-xs",
    lg: "h-9 px-3.5 text-sm",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-mono font-bold tracking-tight",
        sizeClasses,
        tone,
        className,
      )}
    >
      {Icon && <Icon size={size === "lg" ? 16 : 13} />}
      <span>#{rank}</span>
    </span>
  );
}
