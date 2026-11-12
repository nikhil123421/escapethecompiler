import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users } from "lucide-react";

import { TeamCard } from "@/components/teams/TeamCard";
import { TeamFilters } from "@/components/teams/TeamFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams } from "@/hooks/useGameState";
import { useAuth } from "@/lib/auth";

export function TeamsPage() {
  const { team: currentTeam } = useAuth();
  const { data: teams, isLoading, isError } = useTeams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "escaped" && t.escaped) ||
        (statusFilter === "racing" && t.status === "racing") ||
        (statusFilter === "expired" && t.status === "expired");

      return matchesSearch && matchesStatus;
    });
  }, [teams, search, statusFilter]);

  return (
    <div className="space-y-8 py-8 pb-20">
      {/* Header and Compete Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-display text-xs font-medium text-muted hover:text-ink transition-colors"
            >
              <Trophy size={14} /> Leaderboard
            </Link>
            <Link
              to="/teams"
              className="inline-flex items-center gap-2 rounded-lg bg-elevated px-3.5 py-1.5 font-display text-xs font-semibold text-ink shadow-sm ring-1 ring-white/10"
            >
              <Users size={14} className="text-accent" /> Teams
            </Link>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Teams Directory
          </h1>
          <p className="mt-1 text-sm text-muted">
            All registered groups, room progress pips, and current status.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : isError || !teams ? (
        <EmptyState
          command="teams --list"
          message="Could not load teams"
          description="Failed to retrieve teams directory from the server."
        />
      ) : (
        <div className="space-y-6">
          <TeamFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
          />

          {filteredTeams.length === 0 ? (
            <EmptyState
              command={`grep "${search}"`}
              message="No matching teams found"
              description="Try adjusting your search query or filter settings."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  isCurrent={t.id === currentTeam?.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
