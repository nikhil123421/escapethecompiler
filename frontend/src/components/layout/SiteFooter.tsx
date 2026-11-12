import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p>Escape the Compiler · a team-based DSA escape room</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] font-mono">
            <Link to="/legacy" className="hover:text-ink transition-colors">
              Archive: v1 Legacy Game
            </Link>
            <span>·</span>
            <Link to="/admin" className="hover:text-ink transition-colors">
              Organizer Console
            </Link>
          </div>
        </div>
        <p className="font-mono">5 ROOMS · 90 MINUTES · ONE WAY OUT</p>
      </div>
    </footer>
  );
}
