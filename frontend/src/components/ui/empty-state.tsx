import type { ReactNode } from "react";
import { Terminal } from "lucide-react";

import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  command?: string;
  message?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  command = "query --status",
  message = "No records found.",
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "panel flex flex-col items-center justify-center p-8 text-center sm:p-12",
        className,
      )}
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-1.5 font-mono text-xs text-muted">
        <Terminal size={14} className="text-accent" />
        <span>
          <span className="text-accent">$</span> {command}
        </span>
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{message}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
