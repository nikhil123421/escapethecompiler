import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/leaderboard/RankBadge";
import { ProgressPips } from "@/components/teams/ProgressPips";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { LeaderboardRow } from "@/types/api";

export interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  currentTeamId?: string;
  className?: string;
}

export function LeaderboardTable({
  rows,
  currentTeamId,
  className,
}: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="panel p-8 text-center font-mono text-xs text-muted">
        No teams registered on the leaderboard yet.
      </div>
    );
  }

  return (
    <div className={cn("panel overflow-hidden border-line", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-line bg-elevated/70 text-[11px] text-faint">
              <th className="py-3 px-4 font-medium w-16">RANK</th>
              <th className="py-3 px-4 font-medium">TEAM</th>
              <th className="py-3 px-4 font-medium text-center">SOLVED</th>
              <th className="py-3 px-4 font-medium text-center">HINTS</th>
              <th className="py-3 px-4 font-medium text-right">TIME</th>
              <th className="py-3 px-4 font-medium text-right">SCORE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60 bg-surface">
            {rows.map((row) => {
              const isCurrent = row.team_id === currentTeamId;

              return (
                <tr
                  key={row.team_id}
                  className={cn(
                    "transition-colors hover:bg-elevated/50",
                    isCurrent && "bg-accent/[0.07] hover:bg-accent/[0.12]",
                  )}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-4">
                    <RankBadge rank={row.rank} size="sm" />
                  </td>

                  {/* Team */}
                  <td className="py-3.5 px-4 font-sans">
                    <Link
                      to={`/teams/${row.team_id}`}
                      className="group flex flex-col"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {row.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted">
                          ({row.code})
                        </span>
                        {isCurrent && (
                          <Badge variant="accent" size="sm" className="w-fit">
                            YOU
                          </Badge>
                        )}
                        {row.escaped && (
                          <Badge variant="success" size="sm" className="w-fit">
                            ESCAPED
                          </Badge>
                        )}
                      </div>
                      {row.members && row.members.length > 0 && (
                        <span className="text-[11px] text-faint truncate max-w-xs mt-0.5">
                          {row.members.join(", ")}
                        </span>
                      )}
                    </Link>
                  </td>

                  {/* Solved Pips */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ProgressPips solvedCount={row.solved} total={5} size="sm" />
                      <span className="text-[11px] text-muted">({row.solved})</span>
                    </div>
                  </td>

                  {/* Hints */}
                  <td className="py-3.5 px-4 text-center text-muted">
                    {row.hints_used}
                  </td>

                  {/* Time */}
                  <td className="py-3.5 px-4 text-right tabular-nums text-muted">
                    {row.elapsed_seconds ? formatDuration(row.elapsed_seconds) : "--:--"}
                  </td>

                  {/* Score */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-sm font-bold text-ink">
                      {row.score}
                    </span>
                    <span className="ml-1 text-[10px] text-faint">pts</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
