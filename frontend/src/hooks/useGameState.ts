import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** The play page's single source of truth. Refetches keep timers honest. */
export function useGameState(token: string | null) {
  return useQuery({
    queryKey: ["game-state", token],
    queryFn: () => api.state(token as string),
    enabled: Boolean(token),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: api.leaderboard,
    refetchInterval: 5_000,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
    refetchInterval: 10_000,
  });
}
