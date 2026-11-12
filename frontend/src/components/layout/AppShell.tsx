import { Outlet } from "react-router-dom";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export function AppShell() {
  return (
    <div className="noise relative isolate flex min-h-screen flex-col overflow-hidden bg-bg">
      <div aria-hidden="true" className="grid-veil pointer-events-none fixed inset-0 -z-10 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none fixed -top-48 -left-52 -z-10 h-[31.25rem] w-[31.25rem] rounded-full bg-accent/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none fixed -right-48 -bottom-56 -z-10 h-[31.25rem] w-[31.25rem] rounded-full bg-violet/10 blur-[130px]" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8"><Outlet /></main>
      <SiteFooter />
    </div>
  );
}
