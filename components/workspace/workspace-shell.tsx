"use client";

import Image from "next/image";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { PagesProvider } from "./pages-context";
import { PageSidebar } from "./page-sidebar";

export function WorkspaceShell({
  userId,
  email,
  displayName,
  username,
  designation,
  role,
  children,
}: {
  userId: string;
  email: string;
  displayName: string;
  username?: string;
  designation?: string;
  role: "admin" | "member" | "director";
  children: ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSidebarOpen]);

  return (
    <PagesProvider>
      <div className="atmosphere-bg flex min-h-full flex-1 flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] bg-[var(--surface-mid)] px-4 py-2.5 lg:hidden">
          <div className="flex items-center gap-3">
            <Image
              src="/ultra-shaheens-logo.png"
              alt="Ultra Shaheens"
              width={32}
              height={32}
              className="h-8 w-8 object-cover"
            />
            <span className="font-[family-name:var(--font-barlow-condensed)] text-lg font-bold uppercase tracking-wide text-[var(--text-primary)]">Shaheens</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-sm bg-white/5 text-[var(--text-primary)] active:scale-95 transition-transform"
            aria-label="Open sidebar"
            aria-expanded={isSidebarOpen}
            aria-controls="workspace-sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sidebar Overlay (Mobile only) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div 
          id="workspace-sidebar"
          className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-300 transform lg:static lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Suspense
            fallback={
              <aside className="glass-panel w-[18rem] md:w-[20rem] shrink-0 animate-pulse border-y-0 border-l-0 border-r border-[var(--glass-border)] p-5 h-full" />
            }
          >
            <PageSidebar
              currentUserId={userId}
              email={email}
              displayName={displayName}
              username={username}
              designation={designation}
              role={role}
              onClose={() => setIsSidebarOpen(false)}
            />
          </Suspense>
        </div>

        <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </PagesProvider>
  );
}
