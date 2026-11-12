export type RoomStatus = "unopened" | "open" | "solved" | "closed";
export type TeamStatus = "racing" | "escaped" | "expired";
export type SupportedLanguage = "javascript" | "python" | "cpp" | "java";

export interface Team {
  id: string;
  code: string;
  name: string;
  members: string[];
  status: TeamStatus;
  score: number;
  started_at: string | null;
  finished_at: string | null;
  escaped: boolean;
}

export interface RoomPublic {
  id: string;
  number: number;
  title: string;
  topic: string;
  prompt: string;
  starter_code: string;
  starter_codes: Partial<Record<SupportedLanguage, string>>;
}

export interface RoomState extends RoomPublic {
  status: RoomStatus;
  opened_at: string | null;
  solved_at: string | null;
  room_deadline: string | null;
  hints_used: number;
  hints_available: number;
  code_piece: string | null;
}

export interface ScoreBreakdown {
  solved_points: number;
  speed_bonus: number;
  hint_penalty: number;
  escape_bonus: number;
  total: number;
}

export interface GameEvent {
  name: string;
  slug: string;
  total_seconds: number;
  room_seconds: number;
  deadline: string | null;
}

export interface GameState {
  server_time: string;
  team: Team;
  event: GameEvent;
  rooms: RoomState[];
  score: ScoreBreakdown;
  can_escape: boolean;
}

export interface CaseResult {
  index: number;
  passed: boolean;
  got: string | null;
  error: string | null;
}

export interface RunResult {
  fatal: string | null;
  passed: number;
  total: number;
  cases: CaseResult[];
  state: GameState;
}

export interface HintResult {
  hint: string;
  hints_used: number;
  hints_available: number;
  state: GameState;
}

export interface FinalResult {
  escaped: boolean;
  state: GameState;
}

export interface RoomPip {
  id: string;
  number: number;
  title: string;
  status: RoomStatus;
}

export interface TeamSummary {
  id: string;
  code: string;
  name: string;
  members: string[];
  status: TeamStatus;
  escaped: boolean;
  solved: number;
  hints_used: number;
  score: number;
  elapsed_seconds: number | null;
  last_activity_at: string | null;
  rooms: RoomPip[];
}

export interface TeamDetail extends TeamSummary {
  started_at: string | null;
  finished_at: string | null;
  submissions: number;
}

export interface LeaderboardRow {
  rank: number;
  team_id: string;
  code: string;
  name: string;
  members: string[];
  solved: number;
  hints_used: number;
  escaped: boolean;
  status: TeamStatus;
  score: number;
  elapsed_seconds: number | null;
  finished_at: string | null;
}

export interface Leaderboard {
  updated_at: string;
  total_teams: number;
  escaped_count: number;
  rows: LeaderboardRow[];
}

export interface Submission {
  id: number | null;
  team_id: string;
  team_name: string;
  room_id: string;
  passed: boolean;
  tests_passed: number;
  tests_total: number;
  error: string | null;
  created_at: string | null;
  language?: SupportedLanguage;
}

export interface AuthResponse {
  token: string;
  team: Team;
}

export interface LoginInput {
  team_code: string;
  team_name: string;
  members: string[];
  passcode: string;
}
