import { Home, LogIn, LogOut, Play, Trophy, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";

const navItem = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.05] hover:text-ink";

export function SiteHeader() {
  const { team, signOutTeam } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    signOutTeam();
    navigate("/", { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <NavLink
          to={team ? "/play" : "/"}
          className="group flex items-center gap-2.5"
          aria-label="Escape the Compiler home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-accent/35 bg-accent/10 font-mono text-xs font-bold text-accent">ETC</span>
          <span className="hidden font-display text-sm font-semibold tracking-tight text-ink sm:block">Escape the Compiler</span>
        </NavLink>
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
          {team ? (
            /* Logged-In View: No Home or Teams tab, only Board and Logout */
            <>
              <NavLink
                to="/play"
                className={({ isActive }) =>
                  cn(navItem, isActive && "bg-white/[0.06] text-ink")
                }
              >
                <Play size={15} /> <span>Game</span>
              </NavLink>

              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  cn(navItem, isActive && "bg-white/[0.06] text-ink")
                }
              >
                <Trophy size={15} /> <span>Board</span>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-danger/40 hover:text-danger transition-colors"
                title="Log out and return to landing page"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            /* Logged-Out Public View: Home, Board, Teams, and Login */
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn(navItem, isActive && "bg-white/[0.06] text-ink")
                }
              >
                <Home size={15} /> <span className="hidden sm:inline">Home</span>
              </NavLink>

              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  cn(navItem, isActive && "bg-white/[0.06] text-ink")
                }
              >
                <Trophy size={15} /> <span className="hidden sm:inline">Board</span>
              </NavLink>

              <NavLink
                to="/teams"
                className={({ isActive }) =>
                  cn(navItem, isActive && "bg-white/[0.06] text-ink")
                }
              >
                <Users size={15} /> <span className="hidden sm:inline">Teams</span>
              </NavLink>

              <NavLink
                to="/login"
                className={buttonStyles("primary", "sm", "ml-1")}
              >
                <LogIn size={14} /> <span>Log in</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
