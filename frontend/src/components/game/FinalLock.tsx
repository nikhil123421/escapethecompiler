import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, Lock, Sparkles, Terminal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";

export interface FinalLockProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string, word: string) => Promise<boolean>;
  isSubmitting: boolean;
  escaped: boolean;
}

export function FinalLock({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  escaped,
}: FinalLockProps) {
  const [code, setCode] = useState("");
  const [word, setWord] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || !word.trim()) {
      toast.warning("Please enter both the 4-digit code and the reboot word.");
      return;
    }
    const success = await onSubmit(code.trim(), word.trim());
    if (success) {
      toast.success("System rebooted! Your team has escaped (+50 pts)!", {
        duration: 8000,
      });
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            {escaped ? <Sparkles size={20} /> : <KeyRound size={20} />}
          </div>
          <DialogTitle>
            {escaped ? "System Rebooted!" : "Master Terminal: Final Reboot"}
          </DialogTitle>
          <DialogDescription>
            {escaped
              ? "Your team entered the correct passcode and escaped the compiler. Check the leaderboard for your official standing!"
              : "Combine the 4 digit pieces from Rooms 1 to 4 in order, along with the decoded keyword from Room 5 to reboot the system."}
          </DialogDescription>
        </DialogHeader>

        {escaped ? (
          <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-5 text-center">
            <Sparkles size={36} className="mx-auto mb-2 text-success" />
            <h4 className="font-display text-lg font-semibold text-success">
              ESCAPE SUCCESSFUL
            </h4>
            <p className="mt-1 text-xs text-muted">
              +50 Escape Bonus Awarded. Time locked.
            </p>
            <Button className="mt-5 w-full" variant="primary" onClick={onClose}>
              Return to Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field
              label="4-Digit Code (Rooms 1–4)"
              htmlFor="final-code"
              hint="4 numbers"
            >
              <Input
                id="final-code"
                placeholder="e.g. 9463"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={8}
                className="font-mono text-base tracking-widest uppercase"
                autoComplete="off"
                required
              />
            </Field>

            <Field
              label="Reboot Word (Room 5)"
              htmlFor="final-word"
              hint="Decoded text"
            >
              <Input
                id="final-word"
                placeholder="e.g. REBOOT"
                value={word}
                onChange={(e) => setWord(e.target.value.toUpperCase())}
                className="font-mono text-base tracking-widest uppercase"
                autoComplete="off"
                required
              />
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-line bg-inset p-3 font-mono text-xs text-muted">
              <span className="flex items-center gap-1.5 text-accent">
                <Terminal size={14} /> REWARD:
              </span>
              <span>+50 PTS &amp; FINISH CLOCK</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Authorizing reboot…"
              ) : (
                <>
                  <Lock size={15} /> Execute Reboot Sequence <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
