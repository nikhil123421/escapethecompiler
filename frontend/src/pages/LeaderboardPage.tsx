import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users } from "lucide-react";

import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LiveIndicator } from "@/components/leaderboard/LiveIndicator";
import { Podium } from "@/components/leaderboard/Podium";
import { TeamFilters } from "@/components/teams/TeamFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboard } from "@/hooks/useGameState";
import { useAuth } from "@/lib/auth";

export function LeaderboardPage() {
  const { team } = useAuth();
  const { data, isLoading, isError } = useLeaderboard();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = data?.rows ?? [];

  // Filtered rows for the table
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.code.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "escaped" && row.escaped) ||
        (statusFilter === "racing" && row.status === "racing") ||
        (statusFilter === "expired" && row.status === "expired");

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="space-y-8 py-8 pb-20">
      {/* Header and Compete Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 rounded-lg bg-elevated px-3.5 py-1.5 font-display text-xs font-semibold text-ink shadow-sm ring-1 ring-white/10"
            >
              <Trophy size={14} className="text-accent" /> Leaderboard
            </Link>
            <Link
              to="/teams"
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-display text-xs font-medium text-muted hover:text-ink transition-colors"
            >
              <Users size={14} /> Teams
            </Link>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Live Leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Real-time standings across all competing teams. Ties broken by faster finish time.
          </p>
        </div>

        <LiveIndicator updatedAt={data?.updated_at} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError || !data ? (
        <EmptyState
          command="leaderboard --fetch"
          message="Could not load leaderboard"
          description="Failed to retrieve standings from the server. Check connectivity."
        />
      ) : (
        <>
          {/* Top 3 Podium */}
          {rows.length > 0 && (
            <Podium teams={rows.slice(0, 3)} currentTeamId={team?.id} />
          )}

          {/* Filters & Full Ranking Table */}
          <div className="space-y-4 pt-4">
            <TeamFilters
              search={search}
              onSearchChange={setSearch}
              status={statusFilter}
              onStatusChange={setStatusFilter}
            />

            <LeaderboardTable
              rows={filteredRows}
              currentTeamId={team?.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
