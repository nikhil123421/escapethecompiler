import { LogOut, Trophy, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimerPill } from "@/components/game/TimerPill";
import { useAuth } from "@/lib/auth";
import type { GameState, RoomState } from "@/types/api";

export interface GameHeaderProps {
  gameState: GameState;
  activeRoom?: RoomState;
  onOpenFinal?: () => void;
}

export function GameHeader({ gameState, activeRoom }: GameHeaderProps) {
  const { signOutTeam } = useAuth();
  const { team, score, event, server_time } = gameState;

  return (
    <header className="border-b border-line bg-surface/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Team Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 font-mono text-sm font-bold text-accent">
            {team.code.replace("TEAM", "T")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-semibold text-ink sm:text-lg">
                {team.name}
              </h1>
              <Badge
                variant={
                  team.status === "escaped"
                    ? "success"
                    : team.status === "expired"
                      ? "danger"
                      : "accent"
                }
              >
                {team.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted">
              <span>CODE: {team.code}</span>
              {team.members && team.members.length > 0 && (
                <>
                  <span className="text-faint">•</span>
                  <span className="text-ink/80">
                    Players: {team.members.join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Timers & Score & Action */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          {/* Active Room Timer if opened */}
          {activeRoom && activeRoom.status === "open" && (
            <TimerPill
              label={`R${activeRoom.number}`}
              deadline={activeRoom.room_deadline}
              serverTime={server_time}
            />
          )}

          {/* Master 90m Timer */}
          <TimerPill
            label="SYSTEM"
            deadline={event.deadline}
            serverTime={server_time}
          />

          {/* Score Display with Breakdown */}
          <div
            className="group relative flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-1.5"
            title="Score Breakdown"
          >
            <Trophy size={16} className="text-accent" />
            <div className="flex flex-col">
              <span className="mono-label text-[9px] text-faint">SCORE</span>
              <span className="font-mono text-base font-bold text-ink">
                {score.total} <span className="text-[11px] font-normal text-muted">pts</span>
              </span>
            </div>

            {/* Score hover tooltip */}
            <div className="pointer-events-none absolute top-full right-0 z-30 mt-2 hidden w-48 rounded-xl border border-line bg-elevated p-3 shadow-xl group-hover:block">
              <p className="mono-label mb-2 border-b border-line pb-1 text-accent">SCORE BREAKDOWN</p>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-muted">
                  <span>Solved ({score.solved_points / 100})</span>
                  <span className="text-ink">+{score.solved_points}</span>
                </div>
                {score.speed_bonus > 0 && (
                  <div className="flex justify-between text-cyan">
                    <span className="flex items-center gap-1">
                      <Zap size={11} /> Speed
                    </span>
                    <span>+{score.speed_bonus}</span>
                  </div>
                )}
                {score.hint_penalty > 0 && (
                  <div className="flex justify-between text-danger">
                    <span>Hints penalty</span>
                    <span>-{score.hint_penalty}</span>
                  </div>
                )}
                {score.escape_bonus > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Escape bonus</span>
                    <span>+{score.escape_bonus}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-1 font-bold text-accent">
                  <span>Total</span>
                  <span>{score.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logout / Exit Session */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Log out of this team session on this laptop?")) {
                signOutTeam();
                window.location.href = "/";
              }
            }}
            className="text-muted hover:text-danger"
            title="Log out and return to landing page"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
