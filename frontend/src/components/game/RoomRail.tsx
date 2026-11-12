import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import type { RoomState } from "@/types/api";

export interface RoomRailProps {
  rooms: RoomState[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  className?: string;
}

export function RoomRail({
  rooms,
  activeRoomId,
  onSelectRoom,
  className,
}: RoomRailProps) {
  return (
    <nav className={cn("flex flex-col gap-2", className)} aria-label="Room selection">
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="mono-label text-[10px] text-faint">ROOMS (5)</span>
        <span className="mono-label text-[10px] text-accent">
          {rooms.filter((r) => r.status === "solved").length} / 5 SOLVED
        </span>
      </div>

      {rooms.map((room) => {
        const isSelected = room.id === activeRoomId;
        const isSolved = room.status === "solved";
        const isOpen = room.status === "open";
        const isClosed = room.status === "closed";

        let statusText = "UNOPENED";
        let statusColor = "text-faint";
        let Icon = Lock;

        if (isSolved) {
          statusText = "SOLVED";
          statusColor = "text-success";
          Icon = CheckCircle2;
        } else if (isOpen) {
          statusText = "OPEN";
          statusColor = "text-warn";
          Icon = Clock;
        } else if (isClosed) {
          statusText = "CLOSED";
          statusColor = "text-danger";
          Icon = XCircle;
        }

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelectRoom(room.id)}
            className={cn(
              "group relative flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all",
              isSelected
                ? "border-accent/50 bg-elevated shadow-[0_0_15px_-3px_rgba(200,247,81,0.15)] ring-1 ring-accent/30"
                : "border-line bg-surface/80 hover:border-line-strong hover:bg-elevated/70",
            )}
          >
            {/* Left Accent indicator when selected */}
            {isSelected && (
              <div className="absolute -left-[1px] top-2 bottom-2 w-1 rounded-r-md bg-accent" />
            )}

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold",
                  isSelected
                    ? "bg-accent/20 text-accent"
                    : "bg-surface text-muted border border-line",
                )}
              >
                0{room.number}
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-ink group-hover:text-accent transition-colors">
                  {room.title}
                </p>
                <p className="text-[11px] text-muted">{room.topic}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Icon size={13} className={statusColor} />
              <span className={statusColor}>{statusText}</span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
