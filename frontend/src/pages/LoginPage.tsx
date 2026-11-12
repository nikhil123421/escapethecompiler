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
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [passcode, setPasscode] = useState("");
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
      await signInTeam({
        team_code: teamCode.trim().toUpperCase(),
        team_name: teamName.trim(),
        members: cleanMembers,
        passcode: passcode.trim(),
      });
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/play";
      navigate(destination, { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Unable to log in right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center py-10">
      <Card className="w-full p-6 sm:p-8">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          <KeyRound size={20} />
        </div>
        <CardTitle className="text-2xl">Enter the system</CardTitle>
        <CardHint>
          Use the team code and event passcode given to your group. Enter your
          team members so they appear on the live leaderboard.
        </CardHint>

        <form className="mt-7 space-y-5" onSubmit={submit}>
          {/* Team Credentials */}
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

            <Field label="Event passcode" htmlFor="passcode" hint="e.g. REBOOT">
              <Input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
          </div>

          <Field label="Team name" htmlFor="team-name">
            <Input
              id="team-name"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Null Pointer Exception"
              autoComplete="organization"
              required
            />
          </Field>

          {/* Number of People in Team */}
          <div className="space-y-2 rounded-xl border border-line bg-inset/50 p-4">
            <div className="flex items-center justify-between">
              <label className="mono-label text-xs font-semibold text-ink flex items-center gap-1.5">
                <Users size={14} className="text-accent" />
                NUMBER OF PEOPLE IN TEAM
              </label>
              <span className="font-mono text-xs text-muted">
                {playerCount} {playerCount === 1 ? "player" : "players"}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6].map((num) => (
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

          <Button
            className="mt-3 w-full"
            size="lg"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Connecting…" : "Start the escape"}{" "}
            <ArrowRight size={17} />
          </Button>
        </form>
      </Card>
    </section>
  );
}
