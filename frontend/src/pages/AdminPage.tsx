import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Code2,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/format";

export function AdminPage() {
  const { organizerToken, signInOrganizer, signOutOrganizer } = useAuth();

  const [passcode, setPasscode] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tab, setTab] = useState("teams");

  // Create team dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const {
    data: teams,
    isLoading: isLoadingTeams,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ["admin-teams", organizerToken],
    queryFn: () => api.adminTeams(organizerToken as string),
    enabled: Boolean(organizerToken),
    refetchInterval: 10_000,
  });

  const {
    data: submissions,
    isLoading: isLoadingSubmissions,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ["admin-submissions", organizerToken],
    queryFn: () => api.adminSubmissions(organizerToken as string),
    enabled: Boolean(organizerToken),
    refetchInterval: 5_000,
  });

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!passcode) return;
    setIsLoggingIn(true);
    try {
      await signInOrganizer(passcode);
      toast.success("Organizer session authorized.");
      setPasscode("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Invalid organizer passcode.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!organizerToken || !newCode.trim() || !newName.trim()) return;
    setIsCreating(true);
    try {
      const members = newMembers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${organizerToken}`,
        },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newName.trim(),
          members,
        }),
      });

      await refetchTeams();
      toast.success(`Team ${newCode.toUpperCase()} created.`);
      setIsCreateOpen(false);
      setNewCode("");
      setNewName("");
      setNewMembers("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create team.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleResetTeam(teamId: string, teamName: string) {
    if (
      !window.confirm(
        `Are you sure you want to reset all progress for "${teamName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await api.adminResetTeam(organizerToken as string, teamId);
      await refetchTeams();
      toast.success(`Progress reset for ${teamName}.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to reset team.",
      );
    }
  }

  async function handleDeleteTeam(teamId: string, teamName: string, teamCode: string) {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete team "${teamName}" (${teamCode})?\n\nThis will remove their progress, submissions, and leaderboard ranking.`,
      )
    ) {
      return;
    }

    try {
      await api.adminDeleteTeam(organizerToken as string, teamId);
      await refetchTeams();
      await refetchSubmissions();
      toast.success(`Team "${teamName}" (${teamCode}) deleted.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete team.",
      );
    }
  }

  async function handleResetEvent() {
    const confirmation = window.prompt(
      'DANGER: To reset all teams and wipe the entire event, type "RESET" below:',
    );
    if (confirmation !== "RESET") return;

    try {
      await api.adminResetEvent(organizerToken as string);
      await refetchTeams();
      await refetchSubmissions();
      toast.success("Event progress reset for all teams.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to reset event.",
      );
    }
  }

  // If not logged in as organizer, show auth gate
  if (!organizerToken) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center py-14">
        <Card className="w-full p-6 sm:p-8">
          <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl border border-violet/30 bg-violet/10 text-violet">
            <Shield size={20} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Organizer Console
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Enter the organizer passcode to manage teams, watch real-time submissions, or reset the event.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <Field label="Organizer passcode" htmlFor="organizer-passcode">
              <Input
                id="organizer-passcode"
                type="password"
                placeholder="••••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Verifying…" : "Access Console"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono-label text-violet">EVENT CONTROL</span>
            <Badge variant="violet">ORGANIZER</Badge>
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
            Organizer Console
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={handleResetEvent}
            title="Reset whole event"
          >
            <RotateCcw size={14} /> Reset Event
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOutOrganizer}
            className="text-muted hover:text-ink"
          >
            <LogOut size={14} /> Exit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="teams">
              <Users size={14} /> Teams ({teams?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="submissions">
              <Code2 size={14} /> Live Submissions
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "teams" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={14} /> Add Team
          </Button>
        )}
      </div>

      {/* Tab: Teams */}
      {tab === "teams" && (
        <div className="space-y-4">
          {isLoadingTeams ? (
            <Skeleton className="h-64 w-full" />
          ) : !teams || teams.length === 0 ? (
            <EmptyState
              command="admin teams --list"
              message="No teams found"
              action={
                <Button onClick={() => setIsCreateOpen(true)} size="sm">
                  Create First Team
                </Button>
              }
            />
          ) : (
            <div className="panel overflow-hidden border-line">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-line bg-elevated/70 text-faint">
                    <th className="py-3 px-4">CODE</th>
                    <th className="py-3 px-4 font-sans">NAME</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-center">SOLVED</th>
                    <th className="py-3 px-4 text-center">SCORE</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 bg-surface">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-elevated/40">
                      <td className="py-3 px-4 font-bold text-accent">{t.code}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-ink">
                        {t.name}
                        {t.members && t.members.length > 0 && (
                          <div className="text-[11px] font-normal text-muted">
                            {t.members.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            t.escaped
                              ? "success"
                              : t.status === "expired"
                                ? "danger"
                                : "accent"
                          }
                        >
                          {t.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">{t.solved}/5</td>
                      <td className="py-3 px-4 text-center font-bold text-ink">
                        {t.score}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetTeam(t.id, t.name)}
                            className="text-xs text-muted hover:text-ink"
                            title="Reset team progress"
                          >
                            <RotateCcw size={12} /> Reset
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTeam(t.id, t.name, t.code)}
                            className="text-xs text-danger hover:bg-danger/10"
                            title="Permanently delete team"
                          >
                            <Trash2 size={12} /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Submissions Feed */}
      {tab === "submissions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted font-mono">
            <span>SHOWING LAST 100 CODE RUNS</span>
            <button
              onClick={() => refetchSubmissions()}
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {isLoadingSubmissions ? (
            <Skeleton className="h-64 w-full" />
          ) : !submissions || submissions.length === 0 ? (
            <EmptyState
              command="admin submissions --tail"
              message="No submissions yet"
              description="Submissions from teams running code will appear here in real-time."
            />
          ) : (
            <div className="panel overflow-hidden border-line">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-line bg-elevated/70 text-faint">
                    <th className="py-3 px-4">TIME</th>
                    <th className="py-3 px-4 font-sans">TEAM</th>
                    <th className="py-3 px-4">ROOM</th>
                    <th className="py-3 px-4">OUTCOME</th>
                    <th className="py-3 px-4">TESTS</th>
                    <th className="py-3 px-4">ERROR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 bg-surface">
                  {submissions.map((s, idx) => (
                    <tr key={s.id ?? idx} className="hover:bg-elevated/40">
                      <td className="py-3 px-4 text-faint">
                        {relativeTime(s.created_at)}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-ink">
                        {s.team_name}
                      </td>
                      <td className="py-3 px-4 text-accent">{s.room_id}</td>
                      <td className="py-3 px-4">
                        <Badge variant={s.passed ? "success" : "danger"}>
                          {s.passed ? "PASS" : "FAIL"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {s.tests_passed}/{s.tests_total}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-faint">
                        {s.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <DialogContent onClose={() => setIsCreateOpen(false)}>
          <DialogHeader>
            <DialogTitle>Register New Team</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTeam} className="mt-4 space-y-4">
            <Field label="Team code" hint="e.g. TEAM11" htmlFor="new-code">
              <Input
                id="new-code"
                placeholder="TEAM11"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
              />
            </Field>

            <Field label="Team name" htmlFor="new-name">
              <Input
                id="new-name"
                placeholder="Memory Leakers"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Members (comma-separated)"
              hint="optional"
              htmlFor="new-members"
            >
              <Input
                id="new-members"
                placeholder="Alice, Bob, Charlie"
                value={newMembers}
                onChange={(e) => setNewMembers(e.target.value)}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              disabled={isCreating}
            >
              {isCreating ? "Adding…" : "Create Team"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
