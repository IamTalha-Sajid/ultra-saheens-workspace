"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const POPOVER_W = 360;

type NotificationItem = {
  id: string;
  read: boolean;
  createdAt: string;
  pageId: string | null;
  pageTitle: string;
  mentionLabel: string;
  actorName: string;
  type?: "mention" | "ticket_assigned" | "ticket_comment";
  ticketId?: string | null;
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (sec < 45) return rtf.format(-Math.max(1, sec), "second");
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 48) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (day < 14) return rtf.format(-day, "day");
  return d.toLocaleDateString();
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function updatePopoverPosition(
  anchor: HTMLElement | null,
  setPos: (p: { top: number; right: number }) => void
) {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxH = Math.min(vh * 0.72, 520);
  /** Align popover right edge with bell right edge, clamped so the panel stays in the viewport. */
  const alignRight = vw - r.right;
  const right = Math.min(
    vw - POPOVER_W - margin,
    Math.max(margin, alignRight)
  );
  let top = r.bottom + margin;
  if (top + maxH > vh - margin) {
    const above = r.top - margin - maxH;
    if (above >= margin) top = above;
    else top = Math.max(margin, vh - maxH - margin);
  }
  setPos({ top, right });
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition(anchorRef.current, setPos);
  }, [open, items.length, loading]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePopoverPosition(anchorRef.current, setPos);
    const onResize = () => updatePopoverPosition(anchorRef.current, setPos);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleRead = async (id: string, currentRead: boolean) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: !currentRead }),
    });
    if (!res.ok) return;

    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !currentRead } : n))
    );

    setUnreadCount((c) => {
      // If marking as unread, increase count, otherwise decrease
      if (currentRead) return c + 1;
      return Math.max(0, c - 1);
    });
  };

  const markAllRead = async () => {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!res.ok) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <>
      <div ref={anchorRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-[var(--text-muted)] shadow-[0_1px_2px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:border-white/12 hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white shadow-[0_0_8px_var(--accent-glow)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </div>

      {open && typeof document !== "undefined" ? createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[140] bg-black/25 backdrop-blur-sm"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Mention notifications"
            style={{
              top: pos.top,
              right: pos.right,
              width: POPOVER_W,
              maxHeight: "min(72vh, 520px)",
            }}
            className="notification-popover fixed z-[150] flex flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[rgba(20,20,22,0.95)] shadow-2xl backdrop-blur-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="glass-pill py-0.5 text-[10px] text-[var(--text-muted)]">
                  Inbox
                </span>
                <h2 className="text-sm font-semibold text-white">Notifications</h2>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[rgba(0,0,0,0.2)] px-3 py-3">
              {loading && items.length === 0 ? (
                <p className="px-2 text-sm text-[var(--xanadu)]">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-2 text-sm leading-relaxed text-[var(--gray-nickel)]">
                  No notifications yet. Mentions and task assignments will
                  show up here.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((n) => (
                    <li key={n.id}>
                      <div
                        className={`w-full rounded-xl border px-3.5 py-3 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset] backdrop-blur-xl transition-all cursor-pointer ${n.read
                          ? "border-white/[0.1] bg-[rgba(255,255,255,0.04)] opacity-70"
                          : n.type === "ticket_assigned"
                            ? "border-violet-500/40 bg-violet-500/[0.12] shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                            : "border-emerald-500/40 bg-emerald-500/[0.12] shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          }`}
                        onClick={() => {
                          if ((n.type === "ticket_assigned" || n.type === "ticket_comment") && n.ticketId) {
                            // Mark as read if not already read
                            if (!n.read) {
                              void toggleRead(n.id, n.read);
                            }
                            window.location.href = `/app/board/ticket/${n.ticketId}`;
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {!n.read && (
                                <span className={`h-2 w-2 rounded-full ${n.type === "ticket_assigned"
                                  ? "bg-violet-400 shadow-[0_0_6px_rgb(167,139,250)]"
                                  : "bg-emerald-400 shadow-[0_0_6px_rgb(52,211,153)]"
                                  }`} aria-label="Unread" />
                              )}
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${n.type === "ticket_assigned"
                                ? "bg-violet-500/20 text-violet-300"
                                : n.type === "ticket_comment"
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                                }`}>
                                {n.type === "ticket_assigned" ? "Task" : n.type === "ticket_comment" ? "Comment" : "Mention"}
                              </span>
                              <p className="text-xs text-[var(--text-muted)]">
                                {relativeTime(n.createdAt)}
                              </p>
                            </div>
                            {n.type === "ticket_assigned" ? (
                              <p className="text-sm text-white">
                                <span className="font-medium text-violet-300">
                                  {n.actorName.trim() || "Someone"}
                                </span>{" "}
                                {n.mentionLabel}
                              </p>
                            ) : (
                              <p className="text-sm text-white">
                                <span className="font-medium text-emerald-300">
                                  {n.actorName.trim() || "Someone"}
                                </span>{" "}
                                {n.type === "ticket_comment" ? "mentioned you in a comment on " : "mentioned you in "}
                                <span className="font-medium text-white/95">
                                  {n.pageTitle || "Untitled"}
                                </span>
                                {n.mentionLabel ? (
                                  <span className="text-[var(--text-muted)]">
                                    {" "}
                                    as {n.mentionLabel}
                                  </span>
                                ) : null}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          {(n.type === "ticket_assigned" || n.type === "ticket_comment") && n.ticketId ? (
                            <a
                              href={`/app/board/ticket/${n.ticketId}`}
                              className={`text-xs font-medium hover:underline transition-colors ${n.type === "ticket_assigned" ? "text-violet-300 hover:text-violet-200" : "text-indigo-300 hover:text-indigo-200"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Mark as read if not already read
                                if (!n.read) {
                                  void toggleRead(n.id, n.read);
                                }
                                setOpen(false);
                              }}
                            >
                              View ticket →
                            </a>
                          ) : <span />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleRead(n.id, n.read);
                            }}
                            className="text-xs font-medium text-[var(--xanadu)] hover:text-white hover:underline transition-colors focus:outline-none"
                          >
                            {n.read ? "Mark as unread" : "Mark as read"}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="shrink-0 border-t border-white/[0.08] bg-black/30 px-4 py-2.5 text-[11px] leading-snug text-[var(--text-muted)]">
              Mentions and task assignments appear here. Click &ldquo;View
              ticket&rdquo; to jump to a task.
            </p>
          </div>
        </>,
        document.body
      ) : null}
    </>
  );
}
