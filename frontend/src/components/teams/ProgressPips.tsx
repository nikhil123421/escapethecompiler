import { cn } from "@/lib/cn";
import type { RoomPip } from "@/types/api";

export interface ProgressPipsProps {
  rooms?: RoomPip[];
  solvedCount?: number;
  total?: number;
  className?: string;
  size?: "sm" | "md";
}

export function ProgressPips({
  rooms,
  solvedCount = 0,
  total = 5,
  className,
  size = "md",
}: ProgressPipsProps) {
  const isSmall = size === "sm";

  // If detailed rooms are provided
  if (rooms && rooms.length > 0) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        {rooms.map((room) => {
          let tone = "border-line bg-surface text-faint";
          if (room.status === "solved") tone = "border-success/50 bg-success";
          else if (room.status === "open") tone = "border-warn/50 bg-warn animate-pulse";
          else if (room.status === "closed") tone = "border-danger/50 bg-danger/50";

          return (
            <span
              key={room.id}
              title={`Room ${room.number} (${room.title}): ${room.status}`}
              className={cn(
                "rounded-full border transition-all",
                isSmall ? "h-2 w-2" : "h-2.5 w-2.5",
                tone,
              )}
            />
          );
        })}
      </div>
    );
  }

  // Fallback if only solved count is provided
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {Array.from({ length: total }).map((_, index) => {
        const isSolved = index < solvedCount;
        return (
          <span
            key={index}
            className={cn(
              "rounded-full border transition-all",
              isSmall ? "h-2 w-2" : "h-2.5 w-2.5",
              isSolved
                ? "border-success/50 bg-success"
                : "border-line bg-surface text-faint",
            )}
          />
        );
      })}
    </div>
  );
}
