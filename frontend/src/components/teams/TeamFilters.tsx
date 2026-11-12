import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface TeamFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  className?: string;
}

export function TeamFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  className,
}: TeamFiltersProps) {
  const options = [
    { label: "All", value: "all" },
    { label: "Racing", value: "racing" },
    { label: "Escaped", value: "escaped" },
    { label: "Expired", value: "expired" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Status pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {options.map((opt) => {
          const isActive = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
                  : "border border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-64">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search team or code…"
          className="h-9 pl-8 text-xs"
        />
      </div>
    </div>
  );
}
