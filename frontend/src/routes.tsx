import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { AdminPage } from "@/pages/AdminPage";
import { LandingPage } from "@/pages/LandingPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LegacyPage } from "@/pages/LegacyPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlayPage } from "@/pages/PlayPage";
import { TeamDetailPage } from "@/pages/TeamDetailPage";
import { TeamsPage } from "@/pages/TeamsPage";

function RequireTeam({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="play"
          element={
            <RequireTeam>
              <PlayPage />
            </RequireTeam>
          }
        />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:teamId" element={<TeamDetailPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="legacy" element={<LegacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
