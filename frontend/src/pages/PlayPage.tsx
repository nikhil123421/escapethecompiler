import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Code2, KeyRound, ListOrdered, Play } from "lucide-react";
import { toast } from "sonner";

import { CodeEditor } from "@/components/game/CodeEditor";
import { CodePieces } from "@/components/game/CodePieces";
import { FinalLock } from "@/components/game/FinalLock";
import { GameHeader } from "@/components/game/GameHeader";
import { HintPanel } from "@/components/game/HintPanel";
import { RoomCard } from "@/components/game/RoomCard";
import { RoomRail } from "@/components/game/RoomRail";
import { RunBar } from "@/components/game/RunBar";
import { TestResults } from "@/components/game/TestResults";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameState } from "@/hooks/useGameState";
import { useRunTests } from "@/hooks/useRunTests";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RoomState, SupportedLanguage } from "@/types/api";

function getStarterCode(room: RoomState | undefined, lang: SupportedLanguage): string {
  if (!room) return "";
  if (room.starter_codes && room.starter_codes[lang]) {
    return room.starter_codes[lang]!;
  }
  return room.starter_code ?? "";
}

export function PlayPage() {
  const { token, team } = useAuth();
  const queryClient = useQueryClient();
  const { data: gameState, isLoading, isError, refetch } = useGameState(token);

  const [activeRoomId, setActiveRoomId] = useState<string>("stack");
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>("javascript");
  const [editorCodes, setEditorCodes] = useState<Record<string, string>>({});
  const [roomHints, setRoomHints] = useState<Record<string, string[]>>({});
  const [isOpeningRoom, setIsOpeningRoom] = useState(false);
  const [isTakingHint, setIsTakingHint] = useState(false);
  const [isFinalLockOpen, setIsFinalLockOpen] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [mobileTab, setMobileTab] = useState<string>("editor");

  const { run, isRunning, result, clearResult, isRateLimited, cooldownMs } =
    useRunTests(token);

  // Active room object
  const activeRoom: RoomState | undefined = useMemo(() => {
    if (!gameState?.rooms) return undefined;
    return (
      gameState.rooms.find((r) => r.id === activeRoomId) ?? gameState.rooms[0]
    );
  }, [gameState, activeRoomId]);

  // Load drafts and hints from localStorage on mount / team change
  useEffect(() => {
    if (!team) return;
    try {
      const storedCodes = localStorage.getItem(`etc.drafts.${team.id}`);
      if (storedCodes) setEditorCodes(JSON.parse(storedCodes));

      const storedHints = localStorage.getItem(`etc.hints.${team.id}`);
      if (storedHints) setRoomHints(JSON.parse(storedHints));
    } catch {
      // Ignore parse errors
    }
  }, [team]);

  // Sync editor code with room starter code if not drafted yet
  useEffect(() => {
    if (!activeRoom) return;
    const key = `${activeRoom.id}:${activeLanguage}`;
    setEditorCodes((prev) => {
      if (prev[key] !== undefined) return prev;
      if (activeLanguage === "javascript" && prev[activeRoom.id] !== undefined) {
        return { ...prev, [key]: prev[activeRoom.id] };
      }
      return { ...prev, [key]: getStarterCode(activeRoom, activeLanguage) };
    });
  }, [activeRoom, activeLanguage]);

  // Save drafts to localStorage
  const handleCodeChange = useCallback(
    (code: string) => {
      if (!activeRoom || !team) return;
      const key = `${activeRoom.id}:${activeLanguage}`;
      setEditorCodes((prev) => {
        const next = { ...prev, [key]: code };
        try {
          localStorage.setItem(`etc.drafts.${team.id}`, JSON.stringify(next));
        } catch {
          // Local storage quota or disabled
        }
        return next;
      });
    },
    [activeRoom, activeLanguage, team],
  );

  // Open unopened room
  const handleOpenRoom = useCallback(async () => {
    if (!token || !activeRoom) return;
    setIsOpeningRoom(true);
    try {
      const newState = await api.openRoom(token, activeRoom.id);
      queryClient.setQueryData(["game-state", token], newState);
      toast.success(`${activeRoom.title} opened!`, {
        description: "Your 15-minute room countdown has started.",
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to open room.",
      );
    } finally {
      setIsOpeningRoom(false);
    }
  }, [token, activeRoom, queryClient]);

  // Execute test run
  const handleRunCode = useCallback(async () => {
    if (!activeRoom) return;
    const draftKey = `${activeRoom.id}:${activeLanguage}`;
    const code =
      editorCodes[draftKey] ??
      (activeLanguage === "javascript" ? editorCodes[activeRoom.id] : undefined) ??
      getStarterCode(activeRoom, activeLanguage);
    const res = await run(activeRoom.id, code, activeLanguage);
    if (res && res.passed === res.total && res.state) {
      queryClient.setQueryData(["game-state", token], res.state);
    }
  }, [activeRoom, activeLanguage, editorCodes, run, token, queryClient]);

  // Request next hint
  const handleRequestHint = useCallback(async () => {
    if (!token || !activeRoom || !team) return;
    setIsTakingHint(true);
    try {
      const res = await api.hint(token, activeRoom.id);
      queryClient.setQueryData(["game-state", token], res.state);

      setRoomHints((prev) => {
        const currentHints = prev[activeRoom.id] ?? [];
        const nextHints = [...currentHints, res.hint];
        const nextObj = { ...prev, [activeRoom.id]: nextHints };
        try {
          localStorage.setItem(`etc.hints.${team.id}`, JSON.stringify(nextObj));
        } catch {
          // Local storage
        }
        return nextObj;
      });

      toast.info("Hint revealed (-20 pts):", { description: res.hint });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to retrieve hint.",
      );
    } finally {
      setIsTakingHint(false);
    }
  }, [token, activeRoom, team, queryClient]);

  // Reset starter code
  const handleResetStarter = useCallback(() => {
    if (!activeRoom || !team) return;
    const starter = getStarterCode(activeRoom, activeLanguage);
    const key = `${activeRoom.id}:${activeLanguage}`;
    setEditorCodes((prev) => {
      const next = { ...prev, [key]: starter };
      try {
        localStorage.setItem(`etc.drafts.${team.id}`, JSON.stringify(next));
      } catch {
        // Local storage
      }
      return next;
    });
    toast.info(`Editor reset to starter code for ${activeLanguage}.`);
  }, [activeRoom, activeLanguage, team]);

  // Submit final lock code + word
  const handleSubmitFinal = useCallback(
    async (code: string, word: string) => {
      if (!token) return false;
      setIsSubmittingFinal(true);
      try {
        const res = await api.final(token, code, word);
        if (res.state) {
          queryClient.setQueryData(["game-state", token], res.state);
        }
        return true;
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "The passcode or keyword did not match.",
        );
        return false;
      } finally {
        setIsSubmittingFinal(false);
      }
    },
    [token, queryClient],
  );

  // Switch room
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      setActiveRoomId(roomId);
      clearResult();
    },
    [clearResult],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 py-8">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-[480px] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error / Disconnected state
  if (isError || !gameState) {
    return (
      <div className="py-16">
        <EmptyState
          command="connect --state"
          message="Connection to game server lost"
          description="Could not load your team's live state. Check your connection and re-sync."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl bg-accent px-4 py-2 font-mono text-xs font-bold text-bg transition-colors hover:bg-accent-dim"
            >
              Re-sync State
            </button>
          }
        />
      </div>
    );
  }

  const draftKey = activeRoom ? `${activeRoom.id}:${activeLanguage}` : "";
  const currentCode =
    (activeRoom && (editorCodes[draftKey] ?? (activeLanguage === "javascript" ? editorCodes[activeRoom.id] : undefined))) ??
    getStarterCode(activeRoom, activeLanguage);
  const currentHints = (activeRoom && roomHints[activeRoom.id]) ?? [];
  const isRoomInteractive = activeRoom?.status === "open";

  return (
    <div className="flex flex-col gap-6 py-6 pb-20">
      {/* Top Game Bar */}
      <GameHeader
        gameState={gameState}
        activeRoom={activeRoom}
        onOpenFinal={() => setIsFinalLockOpen(true)}
      />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rooms" className="text-xs">
              <ListOrdered size={14} /> Rooms
            </TabsTrigger>
            <TabsTrigger value="editor" className="text-xs">
              <Code2 size={14} /> Code
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs">
              <Play size={14} /> Results
            </TabsTrigger>
            <TabsTrigger value="vault" className="text-xs">
              <KeyRound size={14} /> Vault
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Column: Room Rail & Vault */}
        <aside
          className={`flex flex-col gap-5 ${
            mobileTab === "rooms" || mobileTab === "vault" ? "block" : "hidden lg:flex"
          }`}
        >
          {(mobileTab === "rooms" || window.innerWidth >= 1024) && (
            <RoomRail
              rooms={gameState.rooms}
              activeRoomId={activeRoom?.id ?? "stack"}
              onSelectRoom={(id) => {
                handleSelectRoom(id);
                setMobileTab("editor");
              }}
            />
          )}

          {(mobileTab === "vault" || window.innerWidth >= 1024) && (
            <CodePieces
              rooms={gameState.rooms}
              canEscape={gameState.can_escape}
              escaped={gameState.team.escaped}
              onOpenFinalLock={() => setIsFinalLockOpen(true)}
            />
          )}
        </aside>

        {/* Right Column: Active Room Mission, Code Editor, Actions, Test Output */}
        <main
          className={`flex flex-col gap-4 ${
            mobileTab === "editor" || mobileTab === "results"
              ? "block"
              : "hidden lg:flex"
          }`}
        >
          {activeRoom && (
            <>
              {/* Room Card & Prompt */}
              {(mobileTab === "editor" || window.innerWidth >= 1024) && (
                <RoomCard
                  room={activeRoom}
                  serverTime={gameState.server_time}
                  onOpenRoom={handleOpenRoom}
                  isOpening={isOpeningRoom}
                />
              )}

              {/* Editor & Controls */}
              {activeRoom.status !== "unopened" && (
                <>
                  {(mobileTab === "editor" || window.innerWidth >= 1024) && (
                    <>
                      <CodeEditor
                        value={currentCode}
                        onChange={handleCodeChange}
                        onRun={handleRunCode}
                        readOnly={!isRoomInteractive}
                        height="360px"
                        language={activeLanguage}
                        onLanguageChange={setActiveLanguage}
                      />

                      <RunBar
                        onRun={handleRunCode}
                        isRunning={isRunning}
                        isRateLimited={isRateLimited}
                        cooldownMs={cooldownMs}
                        onHint={handleRequestHint}
                        hintsAvailable={activeRoom.hints_available}
                        hintsUsed={activeRoom.hints_used}
                        isTakingHint={isTakingHint}
                        onResetStarter={handleResetStarter}
                        disabled={!isRoomInteractive}
                        language={activeLanguage}
                        onLanguageChange={setActiveLanguage}
                      />
                    </>
                  )}

                  {/* Test Results Output */}
                  {(mobileTab === "results" || window.innerWidth >= 1024) && (
                    <TestResults result={result} />
                  )}

                  {/* Revealed Hints */}
                  {(mobileTab === "editor" || mobileTab === "results") && (
                    <HintPanel room={activeRoom} hints={currentHints} />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Final Lock Modal */}
      <FinalLock
        open={isFinalLockOpen}
        onClose={() => setIsFinalLockOpen(false)}
        onSubmit={handleSubmitFinal}
        isSubmitting={isSubmittingFinal}
        escaped={gameState.team.escaped}
      />
    </div>
  );
}
