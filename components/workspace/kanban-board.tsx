"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";
import { TicketDetail } from "./ticket-detail";
import { useSearchParams } from "next/navigation";

type User = {
    _id: string;
    name: string;
    email: string;
    username?: string;
};

type Ticket = {
    _id: string;
    sid: number;
    title: string;
    description: string;
    status: "Todo" | "In progress" | "Blocked" | "Done";
    assigneeId?: User;
    assigneeIds?: User[];
    creatorId: User;
    createdAt: string;
    estimate?: string;
    priority?: "Highest" | "High" | "Medium" | "Low" | "Lowest";
    type?: "Task" | "Bug" | "Story" | "Epic";
};

const PRIORITY_COLORS: Record<string, string> = {
    Highest: "text-rose-400",
    High: "text-orange-400",
    Medium: "text-amber-400",
    Low: "text-sky-400",
    Lowest: "text-white/40",
};

const TYPE_COLORS: Record<string, string> = {
    Task: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    Bug: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    Story: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    Epic: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
};

const COLUMNS: Array<Ticket["status"]> = ["Todo", "In progress", "Done", "Blocked"];

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
    Done: {
        dot: "bg-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300",
        border: "border-emerald-500/20",
        headerBg: "bg-emerald-500/[0.06]",
        cardAccent: "border-l-emerald-400",
        addBorder: "border-emerald-500/30 hover:border-emerald-400/50",
        addBg: "hover:bg-emerald-500/[0.04]",
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

function getTicketAssignees(ticket: Ticket): User[] {
    if (Array.isArray(ticket.assigneeIds) && ticket.assigneeIds.length > 0) {
        return ticket.assigneeIds;
    }
    return ticket.assigneeId ? [ticket.assigneeId] : [];
}

export function KanbanBoard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState<Ticket["status"] | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
    const [filterStatuses, setFilterStatuses] = useState<Ticket["status"][]>([]);
    const [filterDueDate, setFilterDueDate] = useState<string>("");
    const [filterPastDue, setFilterPastDue] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [activeFilterType, setActiveFilterType] = useState<"assignee" | "status" | "dueDate" | "pastDue" | null>(null);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const [filterMenuPos, setFilterMenuPos] = useState({ top: 0, left: 0 });
    const [showArchived, setShowArchived] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket | "assignee"; direction: "asc" | "desc" } | null>(null);
    const { data: session } = useSession();
    const { confirm } = useFeedback();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const isDetailOpen = selectedTicketId !== null;

    useEffect(() => {
        const tid = searchParams.get("ticketId");
        if (tid) setSelectedTicketId(tid);
    }, [searchParams]);

    const handleCloseModal = (hasChanges?: boolean) => {
        setSelectedTicketId(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("ticketId");
        const query = params.toString() ? `?${params.toString()}` : "";
        router.push(query || "/app/board", { scroll: false });
        // Only refresh board if changes were made
        if (hasChanges) {
            void fetchBoard();
        }
    };

    const handleOpenTicket = (id: string) => {
        setSelectedTicketId(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("ticketId", id);
        router.push(`?${params.toString()}`, { scroll: false });
    };

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

    const requestSort = (key: keyof Ticket | "assignee") => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const getSortedTickets = (ticketsToSort: Ticket[]) => {
        if (!sortConfig) return ticketsToSort;

        const priorityOrder: Record<string, number> = { Highest: 5, High: 4, Medium: 3, Low: 2, Lowest: 1 };

        return [...ticketsToSort].sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue: any;
            let bValue: any;

            if (key === "assignee") {
                const aAssignee = getTicketAssignees(a)[0];
                const bAssignee = getTicketAssignees(b)[0];
                aValue = aAssignee ? (aAssignee.name || aAssignee.email).toLowerCase() : "";
                bValue = bAssignee ? (bAssignee.name || bAssignee.email).toLowerCase() : "";
            } else if (key === "priority") {
                aValue = priorityOrder[a.priority ?? "Medium"] || 0;
                bValue = priorityOrder[b.priority ?? "Medium"] || 0;
            } else {
                aValue = a[key] ?? "";
                bValue = b[key] ?? "";
                if (typeof aValue === "string") aValue = aValue.toLowerCase();
                if (typeof bValue === "string") bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return direction === "asc" ? -1 : 1;
            if (aValue > bValue) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const handleCreate = async (status: Ticket["status"]) => {
        if (!newTitle.trim()) { setIsAdding(null); return; }
        const res = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                title: newTitle, 
                status,
                assigneeIds: filterAssigneeIds // Auto-assign to filtered users if present
            }),
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

    const selectedAssigneeNames = useMemo(
        () => users
            .filter((u) => filterAssigneeIds.includes(u._id))
            .map((u) => u.name || u.email.split("@")[0]),
        [users, filterAssigneeIds]
    );

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
        );
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const toggleAssigneeFilter = (id: string) => {
        setFilterAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const toggleStatusFilter = (status: Ticket["status"]) => {
        setFilterStatuses((prev) => (prev.includes(status) ? prev.filter((x) => x !== status) : [...prev, status]));
    };
    const clearAllFilters = () => {
        setFilterAssigneeIds([]);
        setFilterStatuses([]);
        setFilterDueDate("");
        setFilterPastDue(false);
    };

    const activeFiltersCount = (filterAssigneeIds.length > 0 ? 1 : 0)
        + (filterStatuses.length > 0 ? 1 : 0)
        + (filterDueDate ? 1 : 0)
        + (filterPastDue ? 1 : 0);

    const filteredTickets = tickets.filter((t) => {
        const assignees = getTicketAssignees(t);
        const dueDate = t.estimate ? t.estimate.split("T")[0] : "";
        const matchesAssignee = filterAssigneeIds.length === 0 || assignees.some((a) => filterAssigneeIds.includes(a._id));
        const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(t.status);
        const matchesDueDate = !filterDueDate || dueDate === filterDueDate;
        const isPastDue = Boolean(dueDate) && dueDate < todayKey && t.status !== "Done";
        const matchesPastDue = !filterPastDue || isPastDue;
        return matchesAssignee && matchesStatus && matchesDueDate && matchesPastDue;
    });

    const finalTickets = viewMode === "table" ? getSortedTickets(filteredTickets) : filteredTickets;

    const SortIndicator = ({ column }: { column: keyof Ticket | "assignee" }) => {
        if (!sortConfig || sortConfig.key !== column) return <div className="ml-1 w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5-5"/></svg></div>;
        return (
            <span className="ml-1 text-violet-400">
                {sortConfig.direction === "asc" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden><path d="m18 15-6-6-6 6"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden><path d="m6 9 6 6 6-6"/></svg>
                )}
            </span>
        );
    };

    return (
        <div
            className={`relative flex h-full flex-col gap-4 overflow-hidden transition-[padding] duration-300 ${
                isDetailOpen ? "md:pr-[min(72vw,1100px)]" : "md:pr-0"
            }`}
        >
            {/* ── Professional filter bar ── */}
            <div
                className={`flex shrink-0 items-center gap-2 overflow-x-auto rounded-xl border border-white/[0.06] bg-[var(--surface-mid)] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 no-scrollbar transition-all ${
                    isDetailOpen ? "ring-1 ring-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.2)]" : ""
                }`}
            >
                <div className="relative flex items-center gap-2">
                    <button
                        ref={filterBtnRef}
                        type="button"
                        onClick={() => {
                            if (!isFilterMenuOpen && filterBtnRef.current) {
                                const rect = filterBtnRef.current.getBoundingClientRect();
                                setFilterMenuPos({ top: rect.bottom + 8, left: rect.left });
                            }
                            setIsFilterMenuOpen((v) => !v);
                            if (!isFilterMenuOpen) setActiveFilterType(null);
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                            activeFiltersCount > 0
                                ? "border-violet-500/40 bg-violet-500/15 text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                                : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                            <path d="M3 6h18" /><path d="M7 12h10" /><path d="M10 18h4" />
                        </svg>
                        Filter
                        {activeFiltersCount > 0 && (
                            <span className="rounded-full bg-violet-400/25 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">{activeFiltersCount}</span>
                        )}
                    </button>

                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                            Clear Filters
                        </button>
                    )}

                    {isFilterMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[450]" onClick={() => setIsFilterMenuOpen(false)} />
                            <div
                                className="fixed z-[500] w-[320px] rounded-2xl border border-white/[0.12] bg-[var(--surface-overlay)] p-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                                style={{ top: filterMenuPos.top, left: filterMenuPos.left }}
                            >
                                {!activeFilterType ? (
                                    <div className="space-y-1.5">
                                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Choose Filter</p>
                                        <button type="button" onClick={() => setActiveFilterType("assignee")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-white/80 transition-all hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                        <circle cx="9" cy="7" r="4" />
                                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                    </svg>
                                                </span>
                                                By assignee
                                            </span>
                                            <span className="text-white/40 transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                        <button type="button" onClick={() => setActiveFilterType("status")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-white/80 transition-all hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <path d="M2 20h.01" />
                                                        <path d="M7 20v-4" />
                                                        <path d="M12 20v-8" />
                                                        <path d="M17 20V8" />
                                                        <path d="M22 4v16" />
                                                    </svg>
                                                </span>
                                                By status
                                            </span>
                                            <span className="text-white/40 transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                        <button type="button" onClick={() => setActiveFilterType("dueDate")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-white/80 transition-all hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-white">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                </span>
                                                By due date
                                            </span>
                                            <span className="text-white/40 transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                        <button type="button" onClick={() => setActiveFilterType("pastDue")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-white/80 transition-all hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-white">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                                        <line x1="4" x2="4" y1="22" y2="15" />
                                                    </svg>
                                                </span>
                                                By past due
                                            </span>
                                            <span className="text-white/40 transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button type="button" onClick={() => setActiveFilterType(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white">← Back</button>
                                        {activeFilterType === "assignee" && (
                                            <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.015] p-1">
                                                {users.map((u) => {
                                                    const displayName = u.name || u.email.split("@")[0];
                                                    const active = filterAssigneeIds.includes(u._id);
                                                    return (
                                                        <button
                                                            key={u._id}
                                                            type="button"
                                                            onClick={() => toggleAssigneeFilter(u._id)}
                                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-violet-500/20 text-white ring-1 ring-violet-400/30" : "text-white/75 hover:bg-white/[0.06] hover:text-white"}`}
                                                        >
                                                            <span className={`h-2 w-2 rounded-full ${active ? "bg-violet-300" : "bg-white/25"}`} />
                                                            <span className="truncate">{displayName}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {activeFilterType === "status" && (
                                            <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.015] p-1">
                                                {COLUMNS.map((col) => {
                                                    const active = filterStatuses.includes(col);
                                                    return (
                                                        <button
                                                            key={col}
                                                            type="button"
                                                            onClick={() => toggleStatusFilter(col)}
                                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-violet-500/20 text-white ring-1 ring-violet-400/30" : "text-white/75 hover:bg-white/[0.06] hover:text-white"}`}
                                                        >
                                                            <span className={`h-2 w-2 rounded-full ${COL_THEME[col]?.dot}`} />
                                                            {col}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {activeFilterType === "dueDate" && (
                                            <div className="space-y-2 px-2 pb-1">
                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Due date</label>
                                                <input
                                                    type="date"
                                                    value={filterDueDate}
                                                    onChange={(e) => setFilterDueDate(e.target.value)}
                                                    className="glass-input w-full py-2 text-sm [color-scheme:dark]"
                                                />
                                                {filterDueDate && (
                                                    <button type="button" onClick={() => setFilterDueDate("")} className="text-xs text-white/60 hover:text-white">Clear due date filter</button>
                                                )}
                                            </div>
                                        )}
                                        {activeFilterType === "pastDue" && (
                                            <div className="px-2 pb-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterPastDue((v) => !v)}
                                                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors ${filterPastDue ? "border-rose-500/40 bg-rose-500/15 text-rose-200" : "border-white/10 text-white/75 hover:bg-white/[0.06] hover:text-white"}`}
                                                >
                                                    {filterPastDue ? "Past due only: ON" : "Past due only: OFF"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {activeFiltersCount > 0 && (
                    <div className="flex items-center gap-2">
                        {selectedAssigneeNames.length > 0 && (
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/75">
                                Assignee: {selectedAssigneeNames.join(", ")}
                            </span>
                        )}
                        {filterStatuses.length > 0 && (
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/75">
                                Status: {filterStatuses.join(", ")}
                            </span>
                        )}
                        {filterDueDate && (
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/75">
                                Due: {filterDueDate}
                            </span>
                        )}
                        {filterPastDue && (
                            <span className="rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
                                Past due
                            </span>
                        )}
                    </div>
                )}

                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-white/10 bg-[var(--surface-overlay)] p-1 backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setViewMode("kanban")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                viewMode === "kanban" ? "bg-white/10 text-white shadow-md shadow-black/20" : "text-white/40 hover:text-white"
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                            Board
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                viewMode === "table" ? "bg-white/10 text-white shadow-md shadow-black/20" : "text-white/40 hover:text-white"
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
                            Table
                        </button>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <button
                        type="button"
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-1.5 text-[12px] font-semibold transition-all ${showArchived
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

            {viewMode === "kanban" ? (
                <div className="flex flex-1 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
                    {COLUMNS.map((col) => {
                        const theme = COL_THEME[col] ?? COL_THEME.Todo;
                        const colTickets = filteredTickets.filter((t) => t.status === col);
                        return (
                            <div
                                key={col}
                                className={`flex w-[85vw] sm:w-[320px] shrink-0 snap-center flex-col rounded-2xl border bg-[var(--surface-mid)] p-3 ${theme.border}`}
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
                                        const assignees = getTicketAssignees(t);
                                        const primaryAssignee = assignees[0];
                                        const assigneeName = primaryAssignee
                                            ? (primaryAssignee.name || primaryAssignee.email.split("@")[0])
                                            : null;
                                        return (
                                            <div
                                                key={t._id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, t._id)}
                                                onClick={() => handleOpenTicket(t._id)}
                                                className={`group relative cursor-pointer rounded-xl border-l-[3px] border bg-[var(--surface-raised)] p-3.5 transition-all hover:bg-[var(--surface-overlay)] hover:shadow-lg active:cursor-grabbing ${
                                                    t._id === selectedTicketId
                                                        ? "border-violet-400/40 shadow-[0_0_0_1px_rgba(167,139,250,0.45)] bg-[var(--surface-overlay)]"
                                                        : "border-white/[0.06]"
                                                } ${theme.cardAccent}`}
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
                                                <div className="mb-1 flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold tracking-wider text-violet-400/80">US-{t.sid}</span>
                                                </div>
                                                <p className="pr-4 text-sm font-medium leading-snug text-white/90">{t.title}</p>

                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] text-white/30" title="Created at">
                                                            {new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                        </span>
                                                        {t.estimate && (
                                                            <span className="flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 shadow-sm" title="Deadline">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                                {new Date(t.estimate.split('T')[0] + 'T12:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {assigneeName ? (
                                                        <div className="flex items-center gap-1.5" title={assigneeName}>
                                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(assigneeName)} text-[10px] font-bold text-white ring-1 ring-white/20`}>
                                                                {assigneeName.charAt(0).toUpperCase()}
                                                            </span>
                                                            <span className="max-w-[80px] truncate text-[10px] font-medium text-white/50">
                                                                {assignees.length > 1 ? `${assigneeName} +${assignees.length - 1}` : assigneeName}
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
            ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-white/[0.06] bg-[var(--surface-mid)] relative">
                    <table className="w-full text-left text-sm text-white/90 whitespace-nowrap">
                        <thead className="sticky top-0 z-20 bg-[var(--surface-mid)] shadow-sm border-b border-white/10">
                            <tr className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                                <th onClick={() => requestSort("sid")} className="py-3.5 pl-5 pr-2 font-semibold w-20 cursor-pointer group hover:text-white transition-colors">
                                    <div className="flex items-center">ID<SortIndicator column="sid" /></div>
                                </th>
                                <th onClick={() => requestSort("title")} className="py-3.5 px-4 font-semibold w-full min-w-[200px] sm:min-w-[280px] cursor-pointer group hover:text-white transition-colors">
                                    <div className="flex items-center">Task<SortIndicator column="title" /></div>
                                </th>
                                <th onClick={() => requestSort("status")} className="px-4 py-3.5 font-semibold cursor-pointer group hover:text-white transition-colors">
                                    <div className="flex items-center">Status<SortIndicator column="status" /></div>
                                </th>
                                <th onClick={() => requestSort("assignee")} className="px-4 py-3.5 font-semibold cursor-pointer group hover:text-white transition-colors hidden sm:table-cell">
                                    <div className="flex items-center">Assignee<SortIndicator column="assignee" /></div>
                                </th>
                                <th onClick={() => requestSort("priority")} className="px-4 py-3.5 font-semibold cursor-pointer group hover:text-white transition-colors hidden md:table-cell">
                                    <div className="flex items-center">Priority<SortIndicator column="priority" /></div>
                                </th>
                                <th onClick={() => requestSort("estimate")} className="px-4 py-3.5 font-semibold cursor-pointer group hover:text-white transition-colors hidden lg:table-cell">
                                    <div className="flex items-center">Deadline<SortIndicator column="estimate" /></div>
                                </th>
                                <th onClick={() => requestSort("type")} className="px-4 py-3.5 font-semibold cursor-pointer group hover:text-white transition-colors hidden xl:table-cell">
                                    <div className="flex items-center">Type<SortIndicator column="type" /></div>
                                </th>
                                <th className="py-3.5 pr-5 pl-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {finalTickets.map((t) => {
                                const assignees = getTicketAssignees(t);
                                const primaryAssignee = assignees[0];
                                const assigneeName = primaryAssignee
                                    ? (primaryAssignee.name || primaryAssignee.email.split("@")[0])
                                    : null;
                                return (
                                    <tr
                                        key={t._id} 
                                        onClick={() => handleOpenTicket(t._id)}
                                        className={`group cursor-pointer transition-colors hover:bg-white/[0.03] ${
                                            t._id === selectedTicketId ? "bg-violet-500/[0.08]" : ""
                                        }`}
                                    >
                                        <td className="py-3.5 pl-5 pr-2">
                                            <span className="text-[11px] font-bold text-violet-400/70 shrink-0">US-{t.sid}</span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="font-medium max-w-[400px] truncate block">{t.title}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${COL_THEME[t.status]?.badge}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 hidden sm:table-cell">
                                            {assigneeName ? (
                                                <div className="flex items-center gap-2" title={assigneeName}>
                                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(assigneeName)} text-[9px] font-bold text-white ring-1 ring-white/20`}>
                                                        {assigneeName.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="truncate text-xs font-medium text-white/70">
                                                        {assignees.length > 1 ? `${assigneeName} +${assignees.length - 1}` : assigneeName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-white/30 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 hidden md:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[t.priority || "Medium"]?.replace("text-", "bg-") ?? "bg-zinc-500"}`} />
                                                <span className={`text-[11px] font-semibold ${PRIORITY_COLORS[t.priority || "Medium"] ?? "text-white/70"}`}>
                                                    {t.priority || "Medium"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 hidden lg:table-cell">
                                            {t.estimate ? (
                                                <span className="flex items-center gap-1.5 text-xs text-white/60">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                    {new Date(t.estimate.split('T')[0] + 'T12:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-white/30 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 hidden xl:table-cell">
                                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_COLORS[t.type || "Task"] ?? TYPE_COLORS.Task}`}>
                                                {t.type || "Task"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-5 pl-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); archiveTicket(t._id, !showArchived); }}
                                                     className={`rounded-md p-1.5 transition-colors hover:bg-white/10 ${showArchived ? "text-amber-400" : "text-white/40 hover:text-white"}`}
                                                     title={showArchived ? "Unarchive" : "Archive"}
                                                 >
                                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                         <path d="M22 10v6M2 10v6M6 4h12l2 6H4l2-6zM3 10h18v10H3V10z" />
                                                     </svg>
                                                 </button>
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); deleteTicket(t._id); }}
                                                     className="rounded-md p-1.5 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                                                     title="Delete"
                                                 >
                                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                         <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                                     </svg>
                                                 </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {/* Add Card row in table */}
                            <tr className="group">
                                <td colSpan={8} className="p-0">
                                    {isAdding === "Todo" ? (
                                        <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.02] border-y border-white/[0.04]">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newTitle}
                                                onChange={(e) => setNewTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") void handleCreate("Todo");
                                                    if (e.key === "Escape") setIsAdding(null);
                                                }}
                                                placeholder="Task title..."
                                                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => void handleCreate("Todo")}
                                                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => setIsAdding(null)}
                                                    className="px-2 py-1.5 text-xs text-white/40 hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAdding("Todo")}
                                            className="flex w-full items-center gap-2 px-5 py-3 text-xs font-medium text-white/30 hover:bg-white/[0.02] hover:text-white/60 transition-colors"
                                        >
                                            <span className="text-lg leading-none">+</span>
                                            Add card
                                        </button>
                                    )}
                                </td>
                            </tr>

                            {finalTickets.length === 0 && !isAdding && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-sm text-white/40">
                                        No tasks found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Ticket Detail Modal ── */}
            {selectedTicketId && (
                <div className="fixed inset-y-0 right-0 z-[350] w-full border-l border-white/10 bg-[#09090c] shadow-[-24px_0_50px_rgba(0,0,0,0.48)] animate-in slide-in-from-right duration-300 md:w-[min(72vw,1100px)]">
                    <div className="pointer-events-none absolute inset-y-0 -left-6 w-6 bg-gradient-to-l from-transparent to-black/30" />
                    <div className="h-full overflow-hidden">
                        <TicketDetail
                            ticketId={selectedTicketId} 
                            onClose={handleCloseModal}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
