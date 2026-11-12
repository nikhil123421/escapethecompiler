import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Code, HelpCircle, Trophy, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressPips } from "@/components/teams/ProgressPips";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/format";

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();

  const {
    data: team,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => api.team(teamId as string),
    enabled: Boolean(teamId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="py-16">
        <EmptyState
          command={`team --id ${teamId ?? ""}`}
          message="Team not found"
          description="The requested team does not exist or could not be loaded."
          action={
            <Link
              to="/teams"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 font-mono text-xs font-bold text-bg transition-colors hover:bg-accent-dim"
            >
              <ArrowLeft size={14} /> Back to teams
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 pb-20">
      {/* Back button */}
      <div>
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-xs font-mono text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} /> Back to all teams
        </Link>
      </div>

      {/* Header Banner */}
      <div className="panel p-6 sm:p-8 border-line bg-surface/90">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-accent">
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
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              {team.name}
            </h1>
            {team.members && team.members.length > 0 && (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Users size={13} className="text-faint" />
                <span>Roster: {team.members.join(", ")}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-4 font-mono">
            <Trophy size={22} className="text-accent" />
            <div>
              <p className="mono-label text-[10px] text-faint">TOTAL SCORE</p>
              <p className="text-2xl font-bold text-ink">
                {team.score} <span className="text-xs text-muted font-normal">pts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-line/60 pt-6 sm:grid-cols-4 font-mono text-xs">
          <div>
            <span className="mono-label text-faint">PROGRESS</span>
            <div className="mt-1 flex items-center gap-2">
              <ProgressPips rooms={team.rooms} solvedCount={team.solved} />
              <span className="font-bold text-ink">{team.solved}/5</span>
            </div>
          </div>
          <div>
            <span className="mono-label text-faint">ELAPSED TIME</span>
            <p className="mt-1 flex items-center gap-1.5 font-bold text-ink">
              <Clock size={13} className="text-muted" />
              {formatDuration(team.elapsed_seconds)}
            </p>
          </div>
          <div>
            <span className="mono-label text-faint">HINTS USED</span>
            <p className="mt-1 flex items-center gap-1.5 font-bold text-ink">
              <HelpCircle size={13} className="text-muted" />
              {team.hints_used} (−{team.hints_used * 20} pts)
            </p>
          </div>
          <div>
            <span className="mono-label text-faint">SUBMISSIONS</span>
            <p className="mt-1 flex items-center gap-1.5 font-bold text-ink">
              <Code size={13} className="text-muted" />
              {team.submissions} runs
            </p>
          </div>
        </div>
      </div>

      {/* Per-Room Timeline */}
      <div>
        <h2 className="font-display text-xl font-semibold text-ink mb-4">
          Room Progression
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {team.rooms.map((room) => {
            const isSolved = room.status === "solved";
            const isOpen = room.status === "open";
            const isClosed = room.status === "closed";

            return (
              <Card key={room.id} className="p-4 border-line">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-accent">
                    ROOM 0{room.number}
                  </span>
                  <Badge
                    variant={
                      isSolved
                        ? "success"
                        : isOpen
                          ? "warn"
                          : isClosed
                            ? "danger"
                            : "muted"
                    }
                  >
                    {room.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-ink">
                  {room.title}
                </h3>
                <p className="mt-4 font-mono text-[11px] text-faint">
                  Status: {room.status}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
