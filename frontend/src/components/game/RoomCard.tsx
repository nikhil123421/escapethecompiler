import { Clock, Play, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TimerPill } from "@/components/game/TimerPill";
import type { RoomState } from "@/types/api";

export interface RoomCardProps {
  room: RoomState;
  serverTime: string;
  onOpenRoom: () => void;
  isOpening?: boolean;
}

export function RoomCard({
  room,
  serverTime,
  onOpenRoom,
  isOpening = false,
}: RoomCardProps) {
  const isUnopened = room.status === "unopened";
  const isSolved = room.status === "solved";
  const isClosed = room.status === "closed";

  return (
    <Card className="relative overflow-hidden border-line bg-surface/90">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono-label text-accent">ROOM 0{room.number}</span>
            <Badge variant="cyan">{room.topic}</Badge>
            <Badge
              variant={
                isSolved
                  ? "success"
                  : isClosed
                    ? "danger"
                    : isUnopened
                      ? "muted"
                      : "warn"
              }
            >
              {room.status.toUpperCase()}
            </Badge>
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
            {room.title}
          </h2>
        </div>

        {/* Room Timer if open */}
        {room.status === "open" && (
          <TimerPill
            label="ROOM TIME"
            deadline={room.room_deadline}
            serverTime={serverTime}
          />
        )}
      </div>

      {/* Content */}
      <div className="mt-4">
        {isUnopened ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-elevated/40 p-6 text-center">
            <Clock size={32} className="mb-2 text-warn opacity-80" />
            <h3 className="font-display text-base font-semibold text-ink">
              Ready to enter {room.title}?
            </h3>
            <p className="mt-1 max-w-md text-xs text-muted">
              Opening this room starts a strict 15-minute timer. Solved within 10 minutes awards a +30 speed bonus!
            </p>
            <Button
              className="mt-4"
              variant="primary"
              onClick={onOpenRoom}
              disabled={isOpening}
            >
              <Play size={15} />
              {isOpening ? "Opening room…" : "Open Room (Start 15m Timer)"}
            </Button>
          </div>
        ) : (
          <div>
            <p className="mono-label mb-1.5 text-muted">MISSION PROMPT</p>
            <div className="rounded-xl border border-line bg-inset p-4 font-sans text-sm leading-relaxed text-ink/90">
              {room.prompt}
            </div>

            {/* Solved or Closed alert */}
            {isSolved && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-xs text-success">
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles size={15} /> Room Solved! (+100 pts)
                </span>
                <span className="font-mono font-bold tracking-wider">
                  PIECE: {room.code_piece}
                </span>
              </div>
            )}

            {isClosed && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs text-danger">
                <span>Room expired (15m elapsed). No points awarded.</span>
                <span className="font-mono font-bold tracking-wider">
                  PIECE REVEALED: {room.code_piece}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
