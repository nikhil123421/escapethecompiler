import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, UserCheck, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

export function LoginPage() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamPin, setTeamPin] = useState("");
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [players, setPlayers] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const { signInTeam } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleCountChange(count: number) {
    setPlayerCount(count);
    setPlayers((prev) => {
      const next = [...prev];
      if (count > next.length) {
        while (next.length < count) next.push("");
      } else {
        next.length = count;
      }
      return next;
    });
  }

  function handlePlayerNameChange(index: number, name: string) {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = name;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const cleanMembers = players
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    try {
      if (mode === "register") {
        await signInTeam({
          team_code: teamCode.trim().toUpperCase(),
          team_name: teamName.trim(),
          pin: teamPin.trim(),
          members: cleanMembers,
        });
      } else {
        await signInTeam({
          team_code: teamCode.trim().toUpperCase(),
          pin: teamPin.trim(),
        });
      }
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/play";
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Unable to sign in right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center py-10">
      <Card className="w-full p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <KeyRound size={20} />
          </div>

          {/* Toggle between Register and Sign In */}
          <div className="flex rounded-lg border border-line bg-inset p-1">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={cn(
                "rounded-md px-3 py-1 font-mono text-xs font-semibold transition-all",
                mode === "register"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              New Team
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "rounded-md px-3 py-1 font-mono text-xs font-semibold transition-all",
                mode === "login"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              Existing Team
            </button>
          </div>
        </div>

        <CardTitle className="text-2xl">
          {mode === "register" ? "Register Team" : "Team Sign In"}
        </CardTitle>
        <CardHint>
          {mode === "register"
            ? "Create your team, choose a 4-digit PIN, and enter up to 4 players."
            : "Resume your game using your Team Code and PIN."}
        </CardHint>

        <form className="mt-7 space-y-5" onSubmit={submit}>
          {mode === "register" ? (
            <>
              {/* Team Registration Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Team code" htmlFor="team-code" hint="e.g. TEAM03">
                  <Input
                    id="team-code"
                    value={teamCode}
                    onChange={(event) => setTeamCode(event.target.value)}
                    placeholder="TEAM03"
                    autoComplete="off"
                    required
                  />
                </Field>

                <Field label="Team Secret PIN" htmlFor="team-pin" hint="e.g. 1234">
                  <Input
                    id="team-pin"
                    type="password"
                    value={teamPin}
                    onChange={(event) => setTeamPin(event.target.value)}
                    placeholder="Choose a 4-digit PIN"
                    autoComplete="new-password"
                    maxLength={32}
                    required
                  />
                </Field>
              </div>

              <Field label="Team name" htmlFor="team-name" hint="e.g. Binary Beasts">
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Null Pointer Exception"
                  autoComplete="organization"
                  required
                />
              </Field>

              {/* Number of People in Team (Max 4) */}
              <div className="space-y-2 rounded-xl border border-line bg-inset/50 p-4">
                <div className="flex items-center justify-between">
                  <label className="mono-label text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Users size={14} className="text-accent" />
                    NUMBER OF PEOPLE IN TEAM (MAX 4)
                  </label>
                  <span className="font-mono text-xs text-muted">
                    {playerCount} {playerCount === 1 ? "player" : "players"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleCountChange(num)}
                      className={cn(
                        "rounded-lg border py-2 font-mono text-xs font-bold transition-all",
                        playerCount === num
                          ? "border-accent bg-accent/20 text-accent ring-1 ring-accent/30"
                          : "border-line bg-surface text-muted hover:border-line-dim hover:text-ink",
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Individual Player Names */}
                <div className="space-y-2.5 pt-3 border-t border-line/60">
                  <div className="flex items-center justify-between text-[11px] text-faint">
                    <span className="flex items-center gap-1">
                      <UserCheck size={12} className="text-accent" />
                      PLAYER NAMES
                    </span>
                    <span>Shown on leaderboard & profiles</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Array.from({ length: playerCount }).map((_, idx) => (
                      <Input
                        key={idx}
                        id={`player-${idx + 1}`}
                        placeholder={
                          idx === 0
                            ? "Player 1 (Lead)"
                            : `Player ${idx + 1} Name`
                        }
                        value={players[idx] || ""}
                        onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                        className="text-xs font-mono"
                        autoComplete="off"
                        required={idx === 0}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Returning Team Sign In */
            <div className="space-y-4">
              <Field label="Team code" htmlFor="login-code" hint="e.g. TEAM03">
                <Input
                  id="login-code"
                  value={teamCode}
                  onChange={(event) => setTeamCode(event.target.value)}
                  placeholder="TEAM03"
                  autoComplete="off"
                  required
                />
              </Field>

              <Field label="Team PIN" htmlFor="login-pin" hint="PIN you set during registration">
                <Input
                  id="login-pin"
                  type="password"
                  value={teamPin}
                  onChange={(event) => setTeamPin(event.target.value)}
                  placeholder="••••"
                  autoComplete="current-password"
                  required
                />
              </Field>
            </div>
          )}

          <Button
            className="mt-3 w-full"
            size="lg"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Connecting…"
              : mode === "register"
                ? "Start the escape"
                : "Resume escape"}{" "}
            <ArrowRight size={17} />
          </Button>
        </form>
      </Card>
    </section>
  );
}
