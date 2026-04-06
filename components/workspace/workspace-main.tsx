"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageEditor } from "./page-editor";
import { usePages, type PageCreator } from "./pages-context";

type LoadedPage = {
  title: string;
  icon: string;
  content: unknown;
  createdBy: PageCreator;
};

export function WorkspaceMain() {
  const searchParams = useSearchParams();
  const pageId = searchParams.get("page");
  const { data: session } = useSession();
  const { pages, loading, createPage } = usePages();
  const router = useRouter();
  const [loaded, setLoaded] = useState<LoadedPage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [stats, setStats] = useState({ pages: 0, tickets: 0, myTickets: 0 });

  const handleCreateNewPage = async () => {
    const newPage = await createPage(null);
    if (newPage) {
      router.push(`/app?page=${newPage._id}`);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/pages"),
        fetch("/api/tickets"),
      ]);
      if (pRes.ok && tRes.ok) {
        const { pages } = await pRes.json();
        const { tickets } = await tRes.json();
        const myTickets = tickets.filter((t: any) => t.assigneeId?._id === session?.user?.id).length;
        setStats({ pages: pages.length, tickets: tickets.length, myTickets });
      }
    };
    if (!pageId && session?.user?.id) fetchStats();
  }, [pageId, session?.user?.id, pages.length]);

  useEffect(() => {
    if (!pageId) {
      setLoaded(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setFetching(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`);
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(res.status === 404 ? "Page not found." : "Could not load page.");
            setLoaded(null);
          }
          return;
        }
        const data = (await res.json()) as {
          page: {
            title: string;
            icon?: string;
            content: unknown;
            createdBy: PageCreator;
          };
        };
        if (!cancelled) {
          setLoaded({
            title: data.page.title,
            icon: data.page.icon ?? "",
            content: data.page.content,
            createdBy: data.page.createdBy,
          });
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load page.");
          setLoaded(null);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  if (!pageId) {
    const name = session?.user?.name?.trim();
    const email = session?.user?.email?.trim();
    const firstName =
      name?.split(/\s+/).find(Boolean) ||
      (email?.includes("@") ? email.split("@")[0] : email) ||
      "";

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="glass-panel mx-4 mt-3 flex shrink-0 flex-col gap-1 rounded-xl px-5 py-4 md:mx-6">
          <div className="flex items-center gap-2">
            <span className="glass-pill text-[var(--accent)]">Home</span>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
            Ultra Shaheens workspace
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Your pages and mentions in one place
          </p>
        </header>

        <main className="flex flex-col gap-8 p-6 md:p-10">
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Stats Cards */}
            <div className="glass-card flex flex-col items-center justify-center rounded-3xl bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Pages</p>
              <p className="mt-2 text-4xl font-bold text-white">{stats.pages}</p>
            </div>
            <div className="glass-card flex flex-col items-center justify-center rounded-3xl bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Active Tasks</p>
              <p className="mt-2 text-4xl font-bold text-violet-400">{stats.tickets}</p>
            </div>
            <div className="glass-card flex flex-col items-center justify-center rounded-3xl bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Assigned to Me</p>
              <p className="mt-2 text-4xl font-bold text-amber-400">{stats.myTickets}</p>
            </div>
          </section>

          <section className="flex flex-col gap-6 lg:flex-row">
            {/* Welcome Card */}
            <div className="glass-card glass-card-elevated flex-1 rounded-[2rem] p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Welcome</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                You’re home, {firstName}
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)] md:text-base">
                {loading
                  ? "Loading your pages…"
                  : pages.length === 0
                    ? "You don’t have any pages yet. Use “+ New page” in the sidebar to create your first one and start writing."
                    : "Select a page from the sidebar to continue your work, or jump into the board to track progress. Your workspace is optimized for deep focus and collaboration."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={handleCreateNewPage}
                  className="glass-button-primary px-5 py-2.5 text-sm"
                >
                  + Create New Page
                </button>
                <button
                  onClick={() => router.push('/app/board')}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Open Board
                </button>
              </div>
            </div>

            {/* Quick Links / IO Elements */}
            <div className="flex w-full flex-col gap-4 lg:w-[320px]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">Quick Access</h3>
              <div className="grid gap-3">
                <a href="/app/profile" className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="3" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Profile</p>
                    <p className="text-[10px] text-white/40 italic">Manage your account</p>
                  </div>
                </a>
                <a href="/app/members" className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Members</p>
                    <p className="text-[10px] text-white/40 italic">View workspace team</p>
                  </div>
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (fetching || !loaded) {
    return (
      <>
        <header className="glass-panel mx-4 mt-3 h-[4.25rem] shrink-0 animate-pulse rounded-xl border border-[var(--glass-border)] md:mx-6" />
        <div className="glass-card m-6 flex-1 animate-pulse rounded-[1.5rem] md:m-10" />
      </>
    );
  }

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="glass-card glass-card-elevated max-w-md rounded-2xl px-8 py-6 text-center">
          <p className="text-sm text-red-200/95">{loadError}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageEditor
        key={pageId}
        pageId={pageId}
        initialTitle={loaded.title}
        initialIcon={loaded.icon}
        initialContent={loaded.content}
        createdBy={loaded.createdBy}
      />
    </div>
  );
}
