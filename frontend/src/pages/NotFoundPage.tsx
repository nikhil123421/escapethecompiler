import { Link } from "react-router-dom";
import { buttonStyles } from "@/components/ui/button";

export function NotFoundPage() {
  return <section className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center text-center"><p className="font-mono text-sm text-accent">ERROR 404</p><h1 className="mt-3 text-4xl font-semibold">This route escaped.</h1><p className="mt-3 max-w-md text-muted">The page you requested is not part of the recovery system.</p><Link to="/" className={buttonStyles("primary", "md", "mt-7")}>Return to base</Link></section>;
}
