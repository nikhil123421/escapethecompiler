import { useEffect, useState } from "react";

/**
 * Count down to an ISO deadline.
 *
 * The backend sends `server_time` with every state response, so we can correct
 * for a wrong device clock: remaining = deadline - (now + offset).
 */
export function useCountdown(
  deadline: string | null | undefined,
  serverTime: string | null | undefined,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setRemaining(null);
      return;
    }

    const deadlineMs = new Date(deadline).getTime();
    const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;

    const tick = () => {
      const now = Date.now() + offset;
      setRemaining(Math.max(0, Math.floor((deadlineMs - now) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, serverTime]);

  return remaining;
}
