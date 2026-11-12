import { ArrowRight, Clock3, Code2, LockKeyhole, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const rooms = [
  ["01", "Stack Room", "Evaluate a postfix expression."],
  ["02", "Array Room", "Search a rotated sorted array."],
  ["03", "Graph Room", "Return a BFS visit order."],
  ["04", "Debug Room", "Find and fix the hidden bug."],
  ["05", "Cipher Room", "Decode the compiler's message."],
];

export function LandingPage() {
  return (
    <>
      <section className="grid min-h-[calc(100vh-4rem)] items-center gap-12 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
        <div className="animate-rise">
          <p className="mono-label mb-5 flex items-center gap-2 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> SYSTEM STATUS: CRASHED</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.94] sm:text-6xl lg:text-7xl">Escape the <span className="text-gradient">Compiler.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">Five coding rooms. One locked system. Work with your team, earn every digit, and reboot before the clock runs out.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className={buttonStyles("primary", "lg")}>
              Login / Sign Up <ArrowRight size={17} />
            </Link>
            <Link to="/leaderboard" className={buttonStyles("secondary", "lg")}>Watch the board</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 font-mono text-xs text-muted">
            <span className="flex items-center gap-2"><Code2 size={15} className="text-cyan" /> 5 coding rooms</span>
            <span className="flex items-center gap-2"><Clock3 size={15} className="text-warn" /> 90 minutes</span>
            <span className="flex items-center gap-2"><Users size={15} className="text-violet" /> teams of 3–4</span>
          </div>
        </div>
        <div className="panel glow-lime animate-float overflow-hidden p-0 font-mono text-[13px] leading-6 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-1.5 border-b border-line bg-elevated px-4 py-3"><span className="h-2 w-2 rounded-full bg-danger" /><span className="h-2 w-2 rounded-full bg-warn" /><span className="h-2 w-2 rounded-full bg-success" /><span className="ml-2 text-[10px] tracking-widest text-faint">COMPILER://RECOVERY</span></div>
          <div className="min-h-72 p-5 text-muted"><p><span className="text-accent">$</span> boot --recovery-mode</p><p className="mt-4 text-ink">CRITICAL: compiler process terminated.</p><p>Five safeguards remain online.</p><p>Each room unlocks one fragment of the reboot code.</p><p className="mt-5 text-cyan">Awaiting team input<span className="animate-caret text-accent">_</span></p></div>
        </div>
      </section>
      <section className="pb-8" aria-labelledby="rooms-heading">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="mono-label text-accent">THE MISSION</p><h2 id="rooms-heading" className="mt-2 text-3xl font-semibold">The five rooms</h2></div><LockKeyhole className="mb-1 text-faint" /></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {rooms.map(([number, title, description]) => <Card key={number} className="group p-4 transition-colors hover:border-accent/30"><p className="font-mono text-xs text-accent">{number}</p><h3 className="mt-4 font-display font-semibold">{title}</h3><p className="mt-2 text-sm leading-5 text-muted">{description}</p></Card>)}
        </div>
      </section>
    </>
  );
}
