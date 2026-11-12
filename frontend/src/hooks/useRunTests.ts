import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { RunResult } from "@/types/api";

const MIN_INTERVAL_MS = 1500;

export function useRunTests(token: string | null) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const lastRunTimeRef = useRef<number>(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownMs <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, lastRunTimeRef.current + MIN_INTERVAL_MS - Date.now());
      setCooldownMs(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [cooldownMs]);

  const run = useCallback(
    async (roomId: string, code: string, language: string = "javascript") => {
      if (!token) {
        toast.error("Not authenticated");
        return null;
      }

      const now = Date.now();
      const elapsed = now - lastRunTimeRef.current;
      if (elapsed < MIN_INTERVAL_MS) {
        toast.warning("Give it a second before running again.");
        return null;
      }

      setIsRunning(true);
      lastRunTimeRef.current = now;
      setCooldownMs(MIN_INTERVAL_MS);

      try {
        const res = await api.run(token, roomId, code, language);
        setResult(res);

        // Optimistically update game-state query
        if (res.state) {
          queryClient.setQueryData(["game-state", token], res.state);
        }

        if (res.fatal) {
          toast.error("Code evaluation failed", { description: res.fatal });
        } else if (res.passed === res.total) {
          toast.success("Room Solved!", {
            description: "All test cases passed. Code piece unlocked!",
          });
        } else {
          toast.error(`Tests failed: ${res.passed}/${res.total} passed`);
        }

        return res;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to run tests.";
        toast.error(message);
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [token, queryClient],
  );

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    run,
    isRunning,
    result,
    clearResult,
    isRateLimited: cooldownMs > 0,
    cooldownMs,
  };
}
