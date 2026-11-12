import { cn } from "@/lib/cn";

export interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}

export function ProgressRing({
  progress,
  size = 32,
  strokeWidth = 3,
  className,
  trackClassName,
  indicatorClassName,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference - clamped * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={cn("-rotate-90 transform", className)}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className={cn("fill-transparent stroke-line", trackClassName)}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={cn(
          "fill-transparent stroke-accent transition-all duration-300",
          indicatorClassName,
        )}
      />
    </svg>
  );
}
