import { Suspense } from "react";
import { WorkspaceMain } from "@/components/workspace/workspace-main";

export default function AppHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col">
          <div className="glass-panel mx-4 mt-3 h-[4.25rem] shrink-0 animate-pulse rounded-2xl border border-white/[0.08] md:mx-6" />
          <div className="glass-card m-6 flex-1 animate-pulse rounded-3xl md:m-10" />
        </div>
      }
    >
      <WorkspaceMain />
    </Suspense>
  );
}
