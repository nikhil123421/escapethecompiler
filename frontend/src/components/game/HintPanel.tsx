import { HelpCircle, Lightbulb } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { RoomState } from "@/types/api";

export interface HintPanelProps {
  room: RoomState;
  hints: string[];
}

export function HintPanel({ room, hints }: HintPanelProps) {
  if (room.hints_used === 0 && hints.length === 0) {
    return null;
  }

  return (
    <Card className="border-line bg-surface/90 p-4">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-warn" />
          <h3 className="font-display text-sm font-semibold text-ink">
            Revealed Hints ({room.hints_used}/3)
          </h3>
        </div>
        <span className="mono-label text-faint">−20 PTS PER HINT</span>
      </div>

      <div className="space-y-2.5">
        {hints.map((hint, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg border border-warn/25 bg-warn/5 p-3 text-xs leading-relaxed text-ink/90"
          >
            <HelpCircle size={15} className="text-warn shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-bold text-warn mr-1.5">
                Hint #{index + 1}:
              </span>
              <span>{hint}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
