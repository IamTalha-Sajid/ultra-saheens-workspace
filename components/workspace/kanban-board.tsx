"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";

type User = {
    _id: string;
    name: string;
    email: string;
    username?: string;
};

type Ticket = {
    _id: string;
    title: string;
    description: string;
    status: "Todo" | "In progress" | "Blocked" | "Done";
    assigneeId?: User;
    creatorId: User;
    createdAt: string;
};

const COLUMNS: Array<Ticket["status"]> = ["Todo", "In progress", "Blocked", "Done"];

/* ── Per-column color system ── */
const COL_THEME: Record<
    string,
    {
        dot: string;
        badge: string;
        border: string;
        headerBg: string;
        cardAccent: string;
        addBorder: string;
        addBg: string;
    }
> = {
    Todo: {
        dot: "bg-indigo-400",
        badge: "bg-indigo-500/15 text-indigo-300",
        border: "border-indigo-500/20",
        headerBg: "bg-indigo-500/[0.06]",
        cardAccent: "border-l-indigo-400",
        addBorder: "border-indigo-500/30 hover:border-indigo-400/50",
        addBg: "hover:bg-indigo-500/[0.04]",
    },
    "In progress": {
        dot: "bg-amber-400",
        badge: "bg-amber-500/15 text-amber-300",
        border: "border-amber-500/20",
        headerBg: "bg-amber-500/[0.06]",
        cardAccent: "border-l-amber-400",
        addBorder: "border-amber-500/30 hover:border-amber-400/50",
        addBg: "hover:bg-amber-500/[0.04]",
    },
    Blocked: {
        dot: "bg-rose-400",
        badge: "bg-rose-500/15 text-rose-300",
        border: "border-rose-500/20",
        headerBg: "bg-rose-500/[0.06]",
        cardAccent: "border-l-rose-400",
        addBorder: "border-rose-500/30 hover:border-rose-400/50",
        addBg: "hover:bg-rose-500/[0.04]",
    },
    Done: {
        dot: "bg-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300",
        border: "border-emerald-500/20",
        headerBg: "bg-emerald-500/[0.06]",
        cardAccent: "border-l-emerald-400",
        addBorder: "border-emerald-500/30 hover:border-emerald-400/50",
        addBg: "hover:bg-emerald-500/[0.04]",
    },
};

/* ── Avatar color ring ── */
const AVATAR_COLORS = [
    "from-violet-500 to-fuchsia-600",
    "from-cyan-500 to-blue-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-indigo-500 to-purple-600",
];

function avatarGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function KanbanBoard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState<Ticket["status"] | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [filterUserId, setFilterUserId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const { data: session } = useSession();
    const { confirm } = useFeedback();
    const router = useRouter();

    const fetchBoard = async () => {
        try {
            setLoading(true);
            const [tRes, uRes] = await Promise.all([
                fetch(`/api/tickets?archived=${showArchived}`),
                fetch("/api/users"),
            ]);
            if (tRes.ok) {
                const { tickets } = await tRes.json();
                setTickets(tickets);
            }
            if (uRes.ok) {
                const { users } = await uRes.json();
                setUsers(users);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchBoard();
    }, [showArchived]);

    const handleCreate = async (status: Ticket["status"]) => {
        if (!newTitle.trim()) { setIsAdding(null); return; }
        const res = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle, status }),
        });
        if (res.ok) {
            const { ticket } = await res.json();
            setTickets((prev) => [ticket, ...prev]);
        }
        setNewTitle("");
        setIsAdding(null);
    };

    const updateTicketStatus = async (id: string, newStatus: Ticket["status"]) => {
        setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, status: newStatus } : t)));
        await fetch(`/api/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });
    };

    const archiveTicket = async (id: string, archive: boolean) => {
        setTickets((prev) => prev.filter((t) => t._id !== id));
        await fetch(`/api/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: archive }),
        });
    };

    const deleteTicket = async (id: string) => {
        const ok = await confirm({
            title: "Delete this task?",
            message: "This action cannot be undone. All data will be permanently removed.",
            confirmLabel: "Delete",
            destructive: true,
        });
        if (!ok) return;
        setTickets((prev) => prev.filter((t) => t._id !== id));
        await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("ticketId", id);
    };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent, status: Ticket["status"]) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("ticketId");
        if (id) {
            const ticket = tickets.find((t) => t._id === id);
            if (ticket && ticket.status !== status) void updateTicketStatus(id, status);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
        );
    }

    const visibleTickets = filterUserId
        ? tickets.filter((t) => t.assigneeId?._id === filterUserId)
        : tickets;

    return (
        <div className="flex h-full flex-col gap-4 overflow-hidden">
            {/* ── User filter bar ── */}
            <div className="flex shrink-0 items-center gap-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-[var(--surface-mid)] px-4 py-3">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                    Filter
                </span>
                <button
                    type="button"
                    onClick={() => setFilterUserId(null)}
                    className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${filterUserId === null
                        ? "border-violet-500/40 bg-violet-500/15 text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        : "border-white/8 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white"
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Everyone
                </button>
                {users.map((u) => {
                    const displayName = u.name || u.email.split("@")[0];
                    const isActive = filterUserId === u._id;
                    const gradient = avatarGradient(displayName);
                    return (
                        <button
                            key={u._id}
                            type="button"
                            onClick={() => setFilterUserId(isActive ? null : u._id)}
                            title={u.email}
                            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${isActive
                                ? "border-violet-500/40 bg-violet-500/15 text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                                : "border-white/8 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white"
                                }`}
                        >
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[10px] font-bold text-white ring-1 ring-white/20`}>
                                {displayName.charAt(0).toUpperCase()}
                            </span>
                            {displayName}
                        </button>
                    );
                })}

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-1.5 text-xs font-semibold transition-all ${showArchived
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                            : "border-white/8 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                            <path d="M22 10v6M2 10v6M6 4h12l2 6H4l2-6zM3 10h18v10H3V10z" />
                        </svg>
                        {showArchived ? "Exit Archive" : "View Archive"}
                    </button>
                </div>
            </div>

            {/* ── Columns ── */}
            <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => {
                    const theme = COL_THEME[col] ?? COL_THEME.Todo;
                    const colTickets = visibleTickets.filter((t) => t.status === col);
                    return (
                        <div
                            key={col}
                            className={`flex w-[320px] shrink-0 flex-col rounded-2xl border bg-[var(--surface-mid)] p-3 ${theme.border}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col)}
                        >
                            {/* Column header */}
                            <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 ${theme.headerBg}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                                    <h2 className="text-sm font-semibold text-white">{col}</h2>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${theme.badge}`}>
                                    {colTickets.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex min-h-[100px] flex-1 flex-col gap-2.5 overflow-y-auto">
                                {colTickets.map((t) => {
                                    const assigneeName = t.assigneeId
                                        ? (t.assigneeId.name || t.assigneeId.email.split("@")[0])
                                        : null;
                                    return (
                                        <div
                                            key={t._id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, t._id)}
                                            onClick={() => router.push(`/app/board/ticket/${t._id}`)}
                                            className={`group relative cursor-pointer rounded-xl border-l-[3px] border border-white/[0.06] bg-[var(--surface-raised)] p-3.5 transition-all hover:bg-[var(--surface-overlay)] hover:shadow-lg active:cursor-grabbing ${theme.cardAccent}`}
                                        >
                                            <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); archiveTicket(t._id, !showArchived); }}
                                                    className={`rounded-md p-1 transition-colors hover:bg-white/10 ${showArchived ? "text-amber-400" : "text-white/40 hover:text-white"}`}
                                                    title={showArchived ? "Unarchive" : "Archive"}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <path d="M22 10v6M2 10v6M6 4h12l2 6H4l2-6zM3 10h18v10H3V10z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteTicket(t._id); }}
                                                    className="rounded-md p-1 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="pr-4 text-sm font-medium leading-snug text-white/90">{t.title}</p>

                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-white/30">
                                                    {new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                </span>
                                                {assigneeName ? (
                                                    <div className="flex items-center gap-1.5" title={assigneeName}>
                                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(assigneeName)} text-[10px] font-bold text-white ring-1 ring-white/20`}>
                                                            {assigneeName.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="max-w-[80px] truncate text-[10px] font-medium text-white/50">
                                                            {assigneeName}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="flex items-center gap-1 rounded-md border border-dashed border-white/10 px-1.5 py-0.5 text-[10px] text-white/25">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                                                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                        None
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {isAdding === col ? (
                                    <div className={`rounded-xl border p-3 ${theme.border} bg-white/[0.02]`}>
                                        <input
                                            type="text"
                                            autoFocus
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") void handleCreate(col);
                                                if (e.key === "Escape") setIsAdding(null);
                                            }}
                                            onBlur={() => { if (!newTitle) setIsAdding(null); }}
                                            placeholder="Task title..."
                                            className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                                        />
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => void handleCreate(col)}
                                                className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => setIsAdding(null)}
                                                className="px-2 py-1 text-xs text-white/40 hover:text-white"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAdding(col)}
                                        className={`mt-1 flex w-full items-center justify-center rounded-lg border border-dashed py-2 text-xs text-white/30 transition-colors ${theme.addBorder} ${theme.addBg}`}
                                    >
                                        + Add card
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
