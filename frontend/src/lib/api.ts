import type {
  AuthResponse,
  FinalResult,
  GameState,
  HintResult,
  Leaderboard,
  LoginInput,
  RoomPublic,
  RunResult,
  Submission,
  TeamDetail,
  TeamSummary,
} from "@/types/api";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Every failure the UI can react to, with the backend's stable code. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError("network", "Cannot reach the server. Check your connection.", 0);
  }

  if (!response.ok) {
    let payload: { code?: string; message?: string; detail?: unknown } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new ApiError(
      payload?.code ?? "http_error",
      payload?.message ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  login: (input: LoginInput) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: input }),

  organizerLogin: (passcode: string) =>
    request<{ token: string }>("/api/auth/organizer", {
      method: "POST",
      body: { passcode },
    }),

  rooms: () => request<RoomPublic[]>("/api/rooms"),

  state: (token: string) => request<GameState>("/api/game/state", { token }),

  openRoom: (token: string, roomId: string) =>
    request<GameState>(`/api/game/rooms/${roomId}/open`, { method: "POST", token }),

  run: (token: string, roomId: string, code: string, language: string = "javascript") =>
    request<RunResult>(`/api/game/rooms/${roomId}/run`, {
      method: "POST",
      token,
      body: { code, language },
    }),

  hint: (token: string, roomId: string) =>
    request<HintResult>(`/api/game/rooms/${roomId}/hint`, { method: "POST", token }),

  final: (token: string, code: string, word: string) =>
    request<FinalResult>("/api/game/final", {
      method: "POST",
      token,
      body: { code, word },
    }),

  leaderboard: () => request<Leaderboard>("/api/leaderboard"),

  teams: () => request<TeamSummary[]>("/api/teams"),

  team: (teamId: string) => request<TeamDetail>(`/api/teams/${teamId}`),

  adminTeams: (token: string) => request<TeamSummary[]>("/api/admin/teams", { token }),

  adminResetTeam: (token: string, teamId: string) =>
    request<TeamSummary>(`/api/admin/teams/${teamId}/reset`, { method: "POST", token }),

  adminDeleteTeam: (token: string, teamId: string) =>
    request<{ ok: boolean }>(`/api/admin/teams/${teamId}`, { method: "DELETE", token }),

  adminSubmissions: (token: string) =>
    request<Submission[]>("/api/admin/submissions?limit=100", { token }),

  adminResetEvent: (token: string) =>
    request<{ ok: boolean }>("/api/admin/event/reset", { method: "POST", token }),
};
