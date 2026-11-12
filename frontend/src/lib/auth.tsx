import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import type { AuthResponse, LoginInput, Team } from "@/types/api";

const TOKEN_KEY = "etc.token";
const TEAM_KEY = "etc.team";
const ORGANIZER_KEY = "etc.organizer";

function readStoredTeam(): Team | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    return raw ? (JSON.parse(raw) as Team) : null;
  } catch {
    return null;
  }
}

interface AuthValue {
  token: string | null;
  team: Team | null;
  organizerToken: string | null;
  signInTeam: (input: LoginInput) => Promise<void>;
  signOutTeam: () => void;
  signInOrganizer: (passcode: string) => Promise<void>;
  signOutOrganizer: () => void;
  setTeam: (team: Team) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [team, setTeamState] = useState<Team | null>(readStoredTeam);
  const [organizerToken, setOrganizerToken] = useState<string | null>(() =>
    localStorage.getItem(ORGANIZER_KEY),
  );

  const signInTeam = useCallback(async (input: LoginInput) => {
    const result: AuthResponse = await api.login(input);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(TEAM_KEY, JSON.stringify(result.team));
    setToken(result.token);
    setTeamState(result.team);
  }, []);

  const signOutTeam = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TEAM_KEY);
    setToken(null);
    setTeamState(null);
  }, []);

  const setTeam = useCallback((next: Team) => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(next));
    setTeamState(next);
  }, []);

  const signInOrganizer = useCallback(async (passcode: string) => {
    const result = await api.organizerLogin(passcode);
    localStorage.setItem(ORGANIZER_KEY, result.token);
    setOrganizerToken(result.token);
  }, []);

  const signOutOrganizer = useCallback(() => {
    localStorage.removeItem(ORGANIZER_KEY);
    setOrganizerToken(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      team,
      organizerToken,
      signInTeam,
      signOutTeam,
      signInOrganizer,
      signOutOrganizer,
      setTeam,
    }),
    [token, team, organizerToken, signInTeam, signOutTeam, signInOrganizer, signOutOrganizer, setTeam],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
