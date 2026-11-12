import { Clock, HelpCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressPips } from "@/components/teams/ProgressPips";
import { formatDuration } from "@/lib/format";
import type { TeamSummary } from "@/types/api";

export interface TeamCardProps {
  team: TeamSummary;
  isCurrent?: boolean;
}

export function TeamCard({ team, isCurrent = false }: TeamCardProps) {
  return (
    <Link to={`/teams/${team.id}`} className="block">
      <Card
        className={`group p-4 transition-all hover:border-accent/40 hover:bg-elevated/70 ${
          isCurrent ? "border-accent/50 bg-accent/[0.04] ring-1 ring-accent/30" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent">
                {team.code}
              </span>
              <Badge
                variant={
                  team.escaped
                    ? "success"
                    : team.status === "expired"
                      ? "danger"
                      : "accent"
                }
              >
                {team.status.toUpperCase()}
              </Badge>
              {isCurrent && <Badge variant="accent">YOU</Badge>}
            </div>
            <h3 className="mt-1 font-display text-base font-semibold text-ink group-hover:text-accent transition-colors">
              {team.name}
            </h3>
          </div>

          <div className="text-right font-mono">
            <span className="text-lg font-bold text-ink">{team.score}</span>
            <span className="ml-1 text-[11px] text-faint">pts</span>
          </div>
        </div>

        {/* Member names if available */}
        {team.members && team.members.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
            <Users size={12} className="text-faint" />
            <span className="truncate">{team.members.join(", ")}</span>
          </div>
        )}

        {/* Footer: Pips, Time, Hints */}
        <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <ProgressPips rooms={team.rooms} solvedCount={team.solved} size="sm" />
            <span className="font-mono text-[11px] text-muted">
              {team.solved}/5
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-muted">
            <span className="flex items-center gap-1" title="Elapsed Time">
              <Clock size={12} className="text-faint" />
              {formatDuration(team.elapsed_seconds)}
            </span>
            <span className="flex items-center gap-1" title="Hints Used">
              <HelpCircle size={12} className="text-faint" />
              {team.hints_used}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
