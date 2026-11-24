"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageEditor } from "./page-editor";
import { PageHeader } from "@/components/ui/page-header";
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
        const myTickets = tickets.filter((t: any) => {
          const ids = Array.isArray(t.assigneeIds) && t.assigneeIds.length > 0
            ? t.assigneeIds.map((a: any) => a?._id)
            : t.assigneeId?._id
              ? [t.assigneeId._id]
              : [];
          return ids.includes(session?.user?.id);
        }).length;
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
      session?.user?.username ||
      (email?.includes("@") ? email.split("@")[0] : email) ||
      "";

    const recent = [...pages]
      .sort((x, y) => (y.updatedAt > x.updatedAt ? 1 : -1))
      .slice(0, 5);

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <PageHeader
          title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
          description="Your pages, tasks and mentions in one place."
          actions={
            <>
              <button onClick={handleCreateNewPage} className="glass-button-primary px-4 py-2 text-sm">
                + New page
              </button>
              <Link href="/app/board" className="glass-button px-4 py-2">
                Open board
              </Link>
            </>
          }
        />

        <main className="flex flex-col gap-6 p-4 md:p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Overview">
            {[
              { label: "Total pages", value: stats.pages, href: null },
              { label: "Active tasks", value: stats.tickets, href: "/app/board" },
              { label: "Assigned to me", value: stats.myTickets, href: "/app/board" },
            ].map((c) => {
              const body = (
                <>
                  <p className="eyebrow text-[var(--text-muted)]">{c.label}</p>
                  <p className="mt-2 font-[family-name:var(--font-barlow-condensed)] text-5xl font-bold leading-none text-[var(--text-primary)]">
                    {c.value}
                  </p>
                </>
              );
              return c.href ? (
                <Link key={c.label} href={c.href} className="glass-card p-5">
                  {body}
                </Link>
              ) : (
                <div key={c.label} className="glass-card p-5">
                  {body}
                </div>
              );
            })}
          </section>

          <section className="glass-card p-5" aria-labelledby="recent-pages">
            <h2 id="recent-pages" className="mb-3 text-lg font-bold text-[var(--text-primary)]">
              Recent pages
            </h2>
            {loading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading your pages…</p>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-[var(--text-muted)]">
                  You don’t have any pages yet. Create your first one to start writing.
                </p>
                <button onClick={handleCreateNewPage} className="glass-button-primary px-4 py-2 text-sm">
                  + New page
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--glass-border)]">
                {recent.map((pg) => (
                  <li key={pg._id}>
                    <Link
                      href={`/app?page=${pg._id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-[var(--accent)]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden>{pg.icon || "📄"}</span>
                        <span className="truncate font-medium text-[var(--text-primary)]">
                          {pg.title || "Untitled"}
                        </span>
                      </span>
                      <time className="shrink-0 text-xs text-[var(--text-faint)]" dateTime={pg.updatedAt}>
                        {new Date(pg.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    );
  }

  if (fetching || !loaded) {
    return (
      <>
        <header className="glass-panel mx-4 mt-3 h-[4.25rem] shrink-0 animate-pulse md:mx-6" />
        <div className="glass-card m-6 flex-1 animate-pulse rounded md:m-10" />
      </>
    );
  }

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="glass-card glass-card-elevated max-w-md rounded-2xl px-8 py-6 text-center">
          <p className="text-sm text-danger/95">{loadError}</p>
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
