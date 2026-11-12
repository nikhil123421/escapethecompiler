import { Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { LeaderboardRow } from "@/types/api";

export interface PodiumProps {
  teams: LeaderboardRow[];
  currentTeamId?: string;
  className?: string;
}

export function Podium({ teams, currentTeamId, className }: PodiumProps) {
  if (teams.length === 0) return null;

  const first = teams[0];
  const second = teams[1];
  const third = teams[2];

  const podiumSlots = [
    { team: second, rank: 2, height: "h-40 sm:h-48", color: "border-cyan/40 bg-cyan/5", text: "text-cyan" },
    { team: first, rank: 1, height: "h-48 sm:h-60", color: "border-accent/40 bg-accent/10 glow-lime", text: "text-accent" },
    { team: third, rank: 3, height: "h-32 sm:h-40", color: "border-warn/40 bg-warn/5", text: "text-warn" },
  ];

  return (
    <div className={cn("grid grid-cols-3 items-end gap-2 sm:gap-4 pt-6 pb-2", className)}>
      {podiumSlots.map(({ team, rank, height, color, text }) => {
        if (!team) {
          return (
            <div
              key={rank}
              className={cn(
                "flex flex-col items-center justify-end rounded-2xl border border-dashed border-line bg-surface/40 p-3 text-center",
                height,
              )}
            >
              <span className="font-mono text-xs text-faint">#{rank}</span>
            </div>
          );
        }

        const isCurrent = team.team_id === currentTeamId;

        return (
          <Link
            key={team.team_id}
            to={`/teams/${team.team_id}`}
            className={cn(
              "group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all hover:translate-y-[-2px]",
              height,
              color,
              isCurrent && "ring-2 ring-accent",
            )}
          >
            {/* Crown for #1 */}
            {rank === 1 && (
              <div className="absolute -top-4 rounded-full border border-accent/40 bg-elevated p-1.5 shadow-md">
                <Crown size={18} className="text-accent" />
              </div>
            )}

            {/* Rank badge */}
            <div className="flex flex-col items-center">
              <span className={cn("font-mono text-xs font-bold", text)}>
                #{rank}
              </span>
              <p className="mt-1 font-display text-xs sm:text-sm font-semibold text-ink line-clamp-1 group-hover:text-accent transition-colors">
                {team.name}
              </p>
              <p className="font-mono text-[10px] text-muted">
                {team.code}
              </p>
            </div>

            {/* Score & Time */}
            <div className="mt-2 w-full border-t border-line/60 pt-2 font-mono">
              <div className="flex items-center justify-center gap-1 text-sm sm:text-lg font-bold text-ink">
                <span>{team.score}</span>
                <span className="text-[10px] sm:text-xs font-normal text-muted">pts</span>
              </div>
              <div className="mt-0.5 text-[10px] text-faint">
                {team.escaped ? (
                  <span className="text-success inline-flex items-center gap-1">
                    <Sparkles size={10} /> Escaped ({formatDuration(team.elapsed_seconds)})
                  </span>
                ) : (
                  <span>{team.solved}/5 solved</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
