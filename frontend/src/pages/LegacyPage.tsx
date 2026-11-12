import { ArrowLeft, History } from "lucide-react";
import { Link } from "react-router-dom";

export function LegacyPage() {
  return (
    <div className="flex flex-col py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-muted">
          <History size={16} className="text-warn" />
          <span>
            <strong className="text-ink">Legacy v1 Game (Archived):</strong> Single-file client-side implementation.
          </span>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-accent hover:underline"
        >
          <ArrowLeft size={14} /> Return to Escape the Compiler v2
        </Link>
      </div>

      <div className="h-[800px] w-full rounded-2xl border border-line overflow-hidden shadow-2xl">
        <iframe
          src="/legacy.html"
          title="Legacy Escape the Compiler"
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
