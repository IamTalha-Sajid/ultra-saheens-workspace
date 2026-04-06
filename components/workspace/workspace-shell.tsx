"use client";

import { Suspense, type ReactNode } from "react";
import { PagesProvider } from "./pages-context";
import { PageSidebar } from "./page-sidebar";

export function WorkspaceShell({
  userId,
  email,
  displayName,
  username,
  designation,
  children,
}: {
  userId: string;
  email: string;
  displayName: string;
  username?: string;
  designation?: string;
  children: ReactNode;
}) {
  return (
    <PagesProvider>
      <div className="atmosphere-bg flex min-h-full flex-1">
        <Suspense
          fallback={
            <aside className="glass-panel w-[20.5rem] shrink-0 animate-pulse rounded-r-2xl border-y-0 border-l-0 border-r border-white/[0.08] p-5" />
          }
        >
          <PageSidebar
            currentUserId={userId}
            email={email}
            displayName={displayName}
            username={username}
            designation={designation}
          />
        </Suspense>
        <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </PagesProvider>
  );
}
