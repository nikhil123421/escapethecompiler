import { KeyRound, Lock, Sparkles, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { RoomState } from "@/types/api";

export interface CodePiecesProps {
  rooms: RoomState[];
  canEscape: boolean;
  escaped: boolean;
  onOpenFinalLock: () => void;
  className?: string;
}

export function CodePieces({
  rooms,
  canEscape,
  escaped,
  onOpenFinalLock,
  className,
}: CodePiecesProps) {
  return (
    <div
      className={cn(
        "panel flex flex-col gap-4 p-4 border-line bg-surface/90 sm:p-5",
        canEscape && !escaped && "border-accent/40 glow-lime",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="mono-label text-accent">SYSTEM VAULT</span>
          <h3 className="font-display text-base font-semibold text-ink">
            Reboot Code Fragments
          </h3>
        </div>

        {escaped ? (
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-success">
            <Sparkles size={15} /> SYSTEM REBOOTED (+50 PTS)
          </div>
        ) : canEscape ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenFinalLock}
            className="animate-pulse shadow-lg"
          >
            <Unlock size={14} /> Open Final Lock
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 font-mono text-xs text-faint">
            <Lock size={13} /> Complete all 5 rooms to unlock
          </span>
        )}
      </div>

      {/* 5 Vault Slots */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {rooms.map((room) => {
          const isRevealed = Boolean(room.code_piece);
          return (
            <div
              key={room.id}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border p-2 sm:p-3 text-center transition-all",
                isRevealed
                  ? "border-accent/50 bg-accent/10 shadow-[0_0_15px_-4px_rgba(200,247,81,0.2)]"
                  : "border-line bg-inset text-faint",
              )}
            >
              <span className="mono-label text-[9px] text-faint">
                ROOM 0{room.number}
              </span>
              <div
                className={cn(
                  "mt-1 font-mono text-lg font-bold sm:text-2xl",
                  isRevealed ? "text-accent" : "text-faint",
                )}
              >
                {isRevealed ? room.code_piece : "?"}
              </div>
              <span className="mt-0.5 truncate text-[10px] text-muted">
                {room.topic}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hint if all rooms finished */}
      {canEscape && !escaped && (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-ink">
          <span className="flex items-center gap-2">
            <KeyRound size={15} className="text-accent" />
            <span>All 5 rooms finished! Assemble the 4 digits and keyword to escape.</span>
          </span>
          <Button variant="primary" size="sm" onClick={onOpenFinalLock}>
            Enter Code
          </Button>
        </div>
      )}
    </div>
  );
}
