import { Home, LogIn, LogOut, Play, Trophy, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";

const navItem = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.05] hover:text-ink";

export function SiteHeader() {
  const { team, signOutTeam } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <NavLink to="/" className="group flex items-center gap-2.5" aria-label="Escape the Compiler home">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-accent/35 bg-accent/10 font-mono text-xs font-bold text-accent">ETC</span>
          <span className="hidden font-display text-sm font-semibold tracking-tight text-ink sm:block">Escape the Compiler</span>
        </NavLink>
        <nav className="flex items-center gap-0.5" aria-label="Primary navigation">
          <NavLink to="/" end className={({ isActive }) => cn(navItem, isActive && "bg-white/[0.06] text-ink")}><Home size={15} /> <span className="hidden sm:inline">Home</span></NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => cn(navItem, isActive && "bg-white/[0.06] text-ink")}><Trophy size={15} /> <span className="hidden sm:inline">Board</span></NavLink>
          <NavLink to="/teams" className={({ isActive }) => cn(navItem, isActive && "bg-white/[0.06] text-ink")}><Users size={15} /> <span className="hidden sm:inline">Teams</span></NavLink>
          {team ? (
            <div className="ml-2 flex items-center gap-1.5">
              <NavLink to="/play" className={buttonStyles("primary", "sm")}><Play size={14} /> Game Dashboard</NavLink>
              <button
                type="button"
                onClick={signOutTeam}
                title="Log out"
                className="inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:border-danger/40 hover:text-danger transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={buttonStyles("primary", "sm", "ml-1")}><LogIn size={14} /> <span className="hidden sm:inline">Log in</span></NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
