"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { useFeedback } from "@/components/ui/feedback-provider";
import { usePages, type PageCreator } from "./pages-context";
import { buildPageTree, type PageTreeNode } from "./page-tree-utils";
import { NotificationPanel } from "./notification-panel";

function pageCreatorLabel(c: PageCreator) {
  const n = c.name?.trim();
  if (n) return `by ${n}`;
  const e = c.email?.trim();
  if (e) {
    const at = e.indexOf("@");
    return `by ${at > 0 ? e.slice(0, at) : e}`;
  }
  return "Unknown creator";
}

function TreeRows({
  nodes,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
}: {
  nodes: PageTreeNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <ul className={depth > 0 ? "ml-2 border-l border-white/10 pl-2" : ""}>
      {nodes.map((node) => (
        <li key={node._id} className="mt-0.5">
          <div className="group flex items-center gap-0.5 rounded-lg pr-1 hover:bg-white/5">
            <button
              type="button"
              onClick={() => onSelect(node._id)}
              className={`glass-nav-item min-w-0 flex-1 justify-start border-0 bg-transparent py-1.5 text-left transition-colors ${selectedId === node._id
                ? "bg-white/[0.06] text-white shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
                : "hover:bg-white/[0.04]"
                }`}
            >
              <span className="flex min-w-0 flex-1 items-start gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-[1.1rem] leading-none"
                  aria-hidden
                >
                  {node.icon ? node.icon : null}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate">{node.title || "Untitled"}</span>
                  <span className="block truncate text-[10px] font-medium text-[var(--text-muted)]">
                    {pageCreatorLabel(node.createdBy)}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              title="Subpage"
              onClick={(e) => {
                e.stopPropagation();
                void onAddChild(node._id);
              }}
              className="shrink-0 rounded p-1 text-[var(--text-muted)] opacity-0 transition-all hover:bg-white/10 hover:text-[var(--accent)] group-hover:opacity-100"
            >
              +
            </button>
            <button
              type="button"
              title="Delete page"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node._id, node.title);
              }}
              className="shrink-0 rounded p-1 text-[var(--xanadu)] opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
          {node.children.length > 0 ? (
            <TreeRows
              nodes={node.children}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function PageSidebar({
  currentUserId,
  email,
  displayName,
  username,
  designation,
  onClose,
}: {
  currentUserId: string;
  email: string;
  displayName: string;
  username?: string;
  designation?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("page");
  const isHome = pathname === "/app" && !selectedId;
  const { pages, loading, error, refresh, createPage } = usePages();
  const { confirm, toast } = useFeedback();

  const tree = buildPageTree(pages);

  const goPage = (id: string) => {
    router.push(`/app?page=${id}`);
    onClose?.();
  };

  const handleCreatePage = async (parentId: string | null) => {
    const page = await createPage(parentId);
    if (!page) {
      toast({ message: "Could not create the page.", variant: "error" });
      return;
    }
    goPage(page._id);
    onClose?.();
  };

  const onDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: "Delete page",
      message: `Delete “${title || "Untitled"}” and all subpages? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ message: "Could not delete the page.", variant: "error" });
      return;
    }
    await refresh();
    toast({ message: "Page deleted.", variant: "success" });
    if (selectedId === id) {
      router.push("/app");
    }
  };

  return (
    <aside className="relative z-[1] flex h-full w-[18rem] md:w-[20rem] shrink-0 flex-col border-r border-[var(--glass-border)] bg-[var(--surface-mid)] p-4 shadow-[12px_0_48px_-12px_rgba(0,0,0,0.5)]">
      <div className="mb-7 flex items-start justify-between gap-2">
        <Link
          href="/app"
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${isHome
            ? "border-white/[0.06] bg-white/[0.04] shadow-sm"
            : "hover:border-white/[0.04] hover:bg-white/[0.02]"
            }`}
          aria-label="Home — workspace welcome"
        >
          <Image
            src="/ultra-shaheens-logo.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg object-cover object-center ring-1 ring-white/10"
          />
          <div className="min-w-0 text-left">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Workspace
            </p>
            <p className="truncate text-sm font-semibold text-white">Ultra Shaheens</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationPanel />
          <button 
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white active:scale-95 transition-transform lg:hidden"
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        className="glass-button-primary mb-5 w-full shadow-lg"
        onClick={() => void handleCreatePage(null)}
      >
        + New page
      </button>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Pages">
        <div className="mb-4 flex flex-col gap-1">
          <Link href="/app/board" onClick={onClose} className={`glass-nav-item border border-violet-500/15 shadow-[0_0_8px_rgba(139,92,246,0.06)] hover:bg-violet-500/10 ${pathname === "/app/board" ? "bg-violet-500/20 text-white shadow-inner" : ""}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden>
                <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h10" /><path d="M7 12h10" /><path d="M7 17h10" />
              </svg>
            </span>
            <span className="font-medium text-white/90">Executive Board</span>
          </Link>
          <Link href="/app/board/files" onClick={onClose} className={`glass-nav-item border border-indigo-500/15 shadow-[0_0_8px_rgba(99,102,241,0.06)] hover:bg-indigo-500/10 ${pathname === "/app/board/files" ? "bg-indigo-500/20 text-white shadow-inner" : ""}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-sky-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </span>
            <span className="font-medium text-white/90">Executive Files</span>
          </Link>
        </div>
        <span className="glass-pill mb-2 w-fit px-2 py-1">Pages</span>
        {loading ? (
          <p className="px-2 text-sm text-[var(--xanadu)]">Loading…</p>
        ) : error ? (
          <p className="px-2 text-sm text-red-300">{error}</p>
        ) : tree.length === 0 ? (
          <p className="px-2 text-sm text-[var(--gray-nickel)]">
            No pages yet. Create one above.
          </p>
        ) : (
          <TreeRows
            nodes={tree}
            depth={0}
            selectedId={selectedId}
            onSelect={goPage}
            onAddChild={(pid) => void handleCreatePage(pid)}
            onDelete={onDelete}
          />
        )}
      </nav>

      <div className="mt-auto pt-4 pb-1">
        <Link href="/app/members" onClick={onClose} className={`glass-nav-item mb-4 border border-amber-500/15 shadow-[0_0_8px_rgba(245,158,11,0.06)] hover:bg-amber-500/10 ${pathname === "/app/members" ? "bg-amber-500/20 text-white shadow-inner" : ""}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span className="font-medium text-white/90">Workforce & Members</span>
        </Link>

        <Link
          href="/app/profile"
          className="mb-4 block cursor-pointer rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 shadow-lg transition-all hover:bg-white/[0.07] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Profile and account settings"
        >
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-indigo-400">Signed in as</p>
          <div className="mt-1 flex flex-col gap-0.5">
            <p className="truncate text-sm font-bold text-white">{displayName}</p>
            {designation && (
              <p className="truncate text-[11px] font-semibold text-amber-500/90">{designation}</p>
            )}
            <p className="truncate text-xs font-medium text-white/40">{email}</p>
          </div>
        </Link>
        <div className="px-1">
          <SignOutButton />
        </div>
      </div>
    </aside >

  );
}
