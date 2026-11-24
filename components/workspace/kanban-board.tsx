"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/feedback-provider";
import { TicketDetail } from "./ticket-detail";
import { TitleMentionInput } from "./title-mention-input";
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
    Highest: "text-danger",
    High: "text-orange-400",
    Medium: "text-warn",
    Low: "text-info",
    Lowest: "text-[var(--text-faint)]",
};

const TYPE_COLORS: Record<string, string> = {
    Task: "bg-neutral/15 text-neutral border-neutral/30",
    Bug: "bg-danger/15 text-danger border-danger/30",
    Story: "bg-violet-400/15 text-violet-400 border-violet-400/30",
    Epic: "bg-asparagus/15 text-asparagus border-asparagus/30",
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
        dot: "bg-neutral",
        badge: "bg-neutral/15 text-neutral",
        border: "border-neutral/20",
        headerBg: "bg-neutral/[0.06]",
        cardAccent: "border-l-neutral",
        addBorder: "border-neutral/30 hover:border-neutral/50",
        addBg: "hover:bg-neutral/[0.04]",
    },
    "In progress": {
        dot: "bg-warn",
        badge: "bg-warn/15 text-warn",
        border: "border-warn/20",
        headerBg: "bg-warn/[0.06]",
        cardAccent: "border-l-warn",
        addBorder: "border-warn/30 hover:border-warn/50",
        addBg: "hover:bg-warn/[0.04]",
    },
    Done: {
        dot: "bg-ok",
        badge: "bg-ok/15 text-ok",
        border: "border-ok/20",
        headerBg: "bg-ok/[0.06]",
        cardAccent: "border-l-ok",
        addBorder: "border-ok/30 hover:border-ok/50",
        addBg: "hover:bg-ok/[0.04]",
    },
    Blocked: {
        dot: "bg-danger",
        badge: "bg-danger/15 text-danger",
        border: "border-danger/20",
        headerBg: "bg-danger/[0.06]",
        cardAccent: "border-l-danger",
        addBorder: "border-danger/30 hover:border-danger/50",
        addBg: "hover:bg-danger/[0.04]",
    },
};

/* ── Avatar color ring ── */
const AVATAR_COLORS = [
    "bg-violet-400/20 text-violet-400",
    "bg-info/20 text-info",
    "bg-warn/20 text-warn",
    "bg-danger/20 text-danger",
    "bg-ok/20 text-ok",
    "bg-asparagus/20 text-asparagus",
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

function getDeadlineStatus(estimate?: string): "overdue" | "soon" | "ok" | null {
    if (!estimate) return null;
    const due = new Date(estimate.split("T")[0] + "T23:59:59");
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue";
    if (diffDays <= 3) return "soon";
    return "ok";
}

const DEADLINE_BADGE_COLORS: Record<"overdue" | "soon" | "ok", string> = {
    overdue: "border-danger/20 bg-danger/10 text-danger hover:border-danger/50 hover:bg-danger/20",
    soon: "border-warn/20 bg-warn/10 text-warn hover:border-warn/50 hover:bg-warn/20",
    ok: "border-ok/20 bg-ok/10 text-ok hover:border-ok/50 hover:bg-ok/20",
};

const DEADLINE_TEXT_COLORS: Record<"overdue" | "soon" | "ok", string> = {
    overdue: "text-danger hover:text-danger",
    soon: "text-warn hover:text-warn",
    ok: "text-ok hover:text-ok",
};

const BOARD_FILTER_KEY = "kanban_board_filters";
function readBoardFilters(): Record<string, unknown> {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(BOARD_FILTER_KEY) ?? "{}") as Record<string, unknown>; }
    catch { return {}; }
}

export function KanbanBoard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [viewMode, setViewMode] = useState<"kanban" | "table">(() => (readBoardFilters().viewMode as "kanban" | "table") ?? "kanban");
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState<Ticket["status"] | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [pendingMentionIds, setPendingMentionIds] = useState<string[]>([]);
    const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>(() => (readBoardFilters().filterAssigneeIds as string[]) ?? []);
    const [filterStatuses, setFilterStatuses] = useState<Ticket["status"][]>(() => (readBoardFilters().filterStatuses as Ticket["status"][]) ?? []);
    const [filterDueDate, setFilterDueDate] = useState<string>(() => (readBoardFilters().filterDueDate as string) ?? "");
    const [filterPastDue, setFilterPastDue] = useState<boolean>(() => (readBoardFilters().filterPastDue as boolean) ?? false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [activeFilterType, setActiveFilterType] = useState<"assignee" | "status" | "dueDate" | "pastDue" | null>(null);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const [filterMenuPos, setFilterMenuPos] = useState({ top: 0, left: 0 });
    const [showArchived, setShowArchived] = useState<boolean>(() => (readBoardFilters().showArchived as boolean) ?? false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket | "assignee"; direction: "asc" | "desc" } | null>(() => (readBoardFilters().sortConfig as { key: keyof Ticket | "assignee"; direction: "asc" | "desc" } | null) ?? null);
    const [activeColumnFilter, setActiveColumnFilter] = useState<string | null>(null);
    const [columnFilterPos, setColumnFilterPos] = useState({ top: 0, left: 0 });
    const [filterPriorities, setFilterPriorities] = useState<string[]>(() => (readBoardFilters().filterPriorities as string[]) ?? []);
    const [filterTypes, setFilterTypes] = useState<string[]>(() => (readBoardFilters().filterTypes as string[]) ?? []);
    const [filterTitle, setFilterTitle] = useState<string>(() => (readBoardFilters().filterTitle as string) ?? "");
    const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
    const [editingDeadlinePos, setEditingDeadlinePos] = useState({ top: 0, left: 0 });
    const { data: session } = useSession();
    const { confirm } = useFeedback();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const isDetailOpen = selectedTicketId !== null;
    const ticketFlushRef = useRef<(() => Promise<void>) | null>(null);
    const deadlineDateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const tid = searchParams.get("ticketId");
        if (tid) setSelectedTicketId(tid);
    }, [searchParams]);

    useEffect(() => {
        try {
            localStorage.setItem(BOARD_FILTER_KEY, JSON.stringify({
                viewMode, filterAssigneeIds, filterStatuses, filterDueDate,
                filterPastDue, filterPriorities, filterTypes, filterTitle,
                showArchived, sortConfig,
            }));
        } catch { /* storage unavailable */ }
    }, [viewMode, filterAssigneeIds, filterStatuses, filterDueDate, filterPastDue, filterPriorities, filterTypes, filterTitle, showArchived, sortConfig]);

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

    useEffect(() => {
        if (!editingDeadlineId) return;
        const closeOnScroll = () => setEditingDeadlineId(null);
        window.addEventListener("scroll", closeOnScroll, true);
        return () => window.removeEventListener("scroll", closeOnScroll, true);
    }, [editingDeadlineId]);

    const requestSort = (key: keyof Ticket | "assignee") => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const openDeadlinePicker = (id: string, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const left = Math.min(rect.left, window.innerWidth - 220);
        const popoverHeight = 190;
        const top = rect.bottom + popoverHeight + 6 > window.innerHeight
            ? Math.max(8, rect.top - popoverHeight - 6)
            : rect.bottom + 6;
        setEditingDeadlinePos({ top, left });
        setEditingDeadlineId(id);
    };

    const updateDeadline = async (id: string, estimate: string | null, close = false) => {
        setTickets((prev) => prev.map((t) => t._id === id ? { ...t, estimate: estimate ?? undefined } : t));
        if (close) setEditingDeadlineId(null);
        await fetch(`/api/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estimate }),
        });
    };

    const openColumnFilter = (col: string, e: React.MouseEvent<HTMLTableCellElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setColumnFilterPos({ top: rect.bottom + 4, left: rect.left });
        setActiveColumnFilter((prev) => (prev === col ? null : col));
    };

    const sortBy = (key: keyof Ticket | "assignee", direction: "asc" | "desc") => {
        setSortConfig({ key, direction });
        setActiveColumnFilter(null);
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
        const assigneeIds = pendingMentionIds.length
            ? Array.from(new Set([...filterAssigneeIds, ...pendingMentionIds]))
            : filterAssigneeIds; // Auto-assign to filtered/mentioned users if present
        const res = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: newTitle,
                status,
                assigneeIds,
            }),
        });
        if (res.ok) {
            const { ticket } = await res.json();
            setTickets((prev) => [ticket, ...prev]);
        }
        setNewTitle("");
        setPendingMentionIds([]);
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
        setFilterAssigneeIds((prev) => (prev.length === 1 && prev[0] === id ? [] : [id]));
    };
    const toggleStatusFilter = (status: Ticket["status"]) => {
        setFilterStatuses((prev) => (prev.includes(status) ? prev.filter((x) => x !== status) : [...prev, status]));
    };
    const togglePriorityFilter = (p: string) => {
        setFilterPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    };
    const toggleTypeFilter = (t: string) => {
        setFilterTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    };
    const clearAllFilters = () => {
        setFilterAssigneeIds([]);
        setFilterStatuses([]);
        setFilterDueDate("");
        setFilterPastDue(false);
        setFilterPriorities([]);
        setFilterTypes([]);
        setFilterTitle("");
    };

    const activeFiltersCount = (filterAssigneeIds.length > 0 ? 1 : 0)
        + (filterStatuses.length > 0 ? 1 : 0)
        + (filterDueDate ? 1 : 0)
        + (filterPastDue ? 1 : 0)
        + (filterPriorities.length > 0 ? 1 : 0)
        + (filterTypes.length > 0 ? 1 : 0)
        + (filterTitle ? 1 : 0);

    const filteredTickets = tickets.filter((t) => {
        const assignees = getTicketAssignees(t);
        const dueDate = t.estimate ? t.estimate.split("T")[0] : "";
        const matchesAssignee = filterAssigneeIds.length === 0 || assignees.some((a) => filterAssigneeIds.includes(a._id));
        const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(t.status);
        const matchesDueDate = !filterDueDate || dueDate === filterDueDate;
        const isPastDue = Boolean(dueDate) && dueDate < todayKey && t.status !== "Done";
        const matchesPastDue = !filterPastDue || isPastDue;
        const matchesPriority = filterPriorities.length === 0 || filterPriorities.includes(t.priority || "Medium");
        const matchesType = filterTypes.length === 0 || filterTypes.includes(t.type || "Task");
        const matchesTitle = !filterTitle || t.title.toLowerCase().includes(filterTitle.toLowerCase());
        return matchesAssignee && matchesStatus && matchesDueDate && matchesPastDue && matchesPriority && matchesType && matchesTitle;
    }).sort((a, b) => {
        // Tickets without a deadline sink to the bottom until one is set.
        if (Boolean(a.estimate) !== Boolean(b.estimate)) return a.estimate ? -1 : 1;
        if (a.estimate && b.estimate) return a.estimate < b.estimate ? -1 : a.estimate > b.estimate ? 1 : 0;
        return 0;
    });

    const finalTickets = viewMode === "table" ? getSortedTickets(filteredTickets) : filteredTickets;

    const SortIndicator = ({ column }: { column: keyof Ticket | "assignee" }) => {
        const isActive = sortConfig?.key === column;
        return (
            <span className={`ml-1 shrink-0 transition-opacity ${isActive ? "text-violet-400 opacity-100" : "opacity-40 group-hover:opacity-70"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden><polygon points="4 4 20 4 14 12 14 19 10 21 10 12 4 4"/></svg>
            </span>
        );
    };

    return (
        <div className="relative flex h-full flex-col gap-4 overflow-hidden" onClick={() => {
            if (!isDetailOpen) return;
            void (async () => {
                await ticketFlushRef.current?.();
                handleCloseModal(true);
            })();
        }}>
            {/* ── Professional filter bar ── */}
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto rounded-xl border border-white/[0.06] bg-[var(--surface-mid)] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 no-scrollbar">
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
                                ? "border-violet-500/40 bg-violet-500/15 text-[var(--text-primary)] "
                                : "border-white/10 bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                            <path d="M3 6h18" /><path d="M7 12h10" /><path d="M10 18h4" />
                        </svg>
                        Filter
                        {activeFiltersCount > 0 && (
                            <span className="rounded-full bg-violet-400/25 px-1.5 py-0.5 text-[11px] font-bold text-violet-200">{activeFiltersCount}</span>
                        )}
                    </button>

                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                        >
                            Clear Filters
                        </button>
                    )}

                    {isFilterMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[450]" onClick={() => setIsFilterMenuOpen(false)} />
                            <div
                                className="fixed z-[500] w-[320px] rounded-2xl border border-white/[0.12] bg-[var(--surface-overlay)] p-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] "
                                style={{ top: filterMenuPos.top, left: filterMenuPos.left }}
                            >
                                {!activeFilterType ? (
                                    <div className="space-y-1.5">
                                        <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Choose Filter</p>
                                        <button type="button" onClick={() => setActiveFilterType("assignee")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-[var(--text-primary)]">
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
                                            <span className="text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                        <button type="button" onClick={() => setActiveFilterType("status")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-[var(--text-primary)]">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
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
                                            <span className="text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                        <button type="button" onClick={() => setActiveFilterType("dueDate")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all hover:border-warn/30 hover:bg-warn/10 hover:text-[var(--text-primary)]">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warn/20 text-warn">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                </span>
                                                By due date
                                            </span>
                                            <span className="text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                        <button type="button" onClick={() => setActiveFilterType("pastDue")} className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all hover:border-danger/30 hover:bg-danger/10 hover:text-[var(--text-primary)]">
                                            <span className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-danger/20 text-danger">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                                        <line x1="4" x2="4" y1="22" y2="15" />
                                                    </svg>
                                                </span>
                                                By past due
                                            </span>
                                            <span className="text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5">›</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button type="button" onClick={() => setActiveFilterType(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-faint)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text-primary)]">← Back</button>
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
                                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-violet-500/20 text-[var(--text-primary)] ring-1 ring-violet-400/30" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}
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
                                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-violet-500/20 text-[var(--text-primary)] ring-1 ring-violet-400/30" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}
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
                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">Due date</label>
                                                <input
                                                    type="date"
                                                    value={filterDueDate}
                                                    onChange={(e) => setFilterDueDate(e.target.value)}
                                                    className="glass-input w-full py-2 text-sm [color-scheme:dark]"
                                                />
                                                {filterDueDate && (
                                                    <button type="button" onClick={() => setFilterDueDate("")} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Clear due date filter</button>
                                                )}
                                            </div>
                                        )}
                                        {activeFilterType === "pastDue" && (
                                            <div className="px-2 pb-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterPastDue((v) => !v)}
                                                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors ${filterPastDue ? "border-danger/40 bg-danger/15 text-danger" : "border-white/10 text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}
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
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                                Assignee: {selectedAssigneeNames.join(", ")}
                            </span>
                        )}
                        {filterStatuses.length > 0 && (
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                                Status: {filterStatuses.join(", ")}
                            </span>
                        )}
                        {filterDueDate && (
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                                Due: {filterDueDate}
                            </span>
                        )}
                        {filterPastDue && (
                            <span className="rounded-md border border-danger/25 bg-danger/10 px-2 py-1 text-[11px] text-danger">
                                Past due
                            </span>
                        )}
                    </div>
                )}

                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-white/10 bg-[var(--surface-overlay)] p-1 ">
                        <button
                            type="button"
                            onClick={() => setViewMode("kanban")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                viewMode === "kanban" ? "bg-white/10 text-[var(--text-primary)] shadow-md shadow-black/20" : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                            Board
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                                viewMode === "table" ? "bg-white/10 text-[var(--text-primary)] shadow-md shadow-black/20" : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"
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
                            ? "border-warn/40 bg-warn/15 text-warn "
                            : "border-white/8 bg-white/[0.03] text-[var(--text-faint)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
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
                                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{col}</h2>
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
                                                onClick={(e) => { e.stopPropagation(); handleOpenTicket(t._id); }}
                                                className={`group relative cursor-pointer rounded-xl border-l-[3px] border bg-[var(--surface-raised)] p-3.5 transition-all hover:bg-[var(--surface-overlay)] hover:shadow-lg active:cursor-grabbing ${
                                                    t._id === selectedTicketId
                                                        ? "border-violet-400/40 shadow-[0_0_0_1px_rgba(167,139,250,0.45)] bg-[var(--surface-overlay)]"
                                                        : "border-white/[0.06]"
                                                } ${theme.cardAccent}`}
                                            >
                                                <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); archiveTicket(t._id, !showArchived); }}
                                                        className={`rounded-md p-1 transition-colors hover:bg-white/10 ${showArchived ? "text-warn" : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"}`}
                                                        title={showArchived ? "Unarchive" : "Archive"}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                            <path d="M22 10v6M2 10v6M6 4h12l2 6H4l2-6zM3 10h18v10H3V10z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteTicket(t._id); }}
                                                        className="rounded-md p-1 text-danger transition-colors hover:bg-danger/10 hover:text-danger"
                                                        title="Delete"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="mb-1 flex items-center gap-1.5">
                                                    <span className="text-xs font-bold tracking-wider text-violet-400">US-{t.sid}</span>
                                                </div>
                                                <p className="pr-4 text-sm font-medium leading-snug text-[var(--text-primary)]">{t.title}</p>

                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] text-[var(--text-faint)]" title="Created at">
                                                            {new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); openDeadlinePicker(t._id, e.currentTarget); }}
                                                            title={t.estimate ? "Edit deadline" : "Add deadline"}
                                                            className="flex items-center"
                                                        >
                                                            {t.estimate ? (
                                                                <span className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold shadow-sm transition-colors ${DEADLINE_BADGE_COLORS[getDeadlineStatus(t.estimate) ?? "ok"]}`}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                                    {new Date(t.estimate.split('T')[0] + 'T12:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-0.5 rounded-md border border-dashed border-white/10 px-1.5 py-0.5 text-[11px] text-[var(--text-faint)] opacity-0 transition-opacity group-hover:opacity-100 hover:border-violet-400/30 hover:text-violet-400">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                                    Due
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                    {assigneeName ? (
                                                        <div className="flex items-center gap-1.5" title={assigneeName}>
                                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${avatarGradient(assigneeName)} text-[11px] font-bold ring-1 ring-white/15`}>
                                                                {assigneeName.charAt(0).toUpperCase()}
                                                            </span>
                                                            <span className="max-w-[80px] truncate text-[11px] font-medium text-[var(--text-faint)]">
                                                                {assignees.length > 1 ? `${assigneeName} +${assignees.length - 1}` : assigneeName}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="flex items-center gap-1 rounded-md border border-dashed border-white/10 px-1.5 py-0.5 text-[11px] text-[var(--text-faint)]">
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
                                            <TitleMentionInput
                                                autoFocus
                                                value={newTitle}
                                                onChange={setNewTitle}
                                                onEnter={() => void handleCreate(col)}
                                                onEscape={() => { setIsAdding(null); setPendingMentionIds([]); }}
                                                onBlur={() => { if (!newTitle) { setIsAdding(null); setPendingMentionIds([]); } }}
                                                placeholder="Task title... (@ to mention)"
                                                className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-white/30 outline-none"
                                                users={users}
                                                onMention={(u) => setPendingMentionIds((prev) => Array.from(new Set([...prev, u._id])))}
                                            />
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => void handleCreate(col)}
                                                    className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-[var(--text-primary)] hover:bg-violet-500"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => { setIsAdding(null); setPendingMentionIds([]); }}
                                                    className="px-2 py-1 text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAdding(col)}
                                            className={`mt-1 flex w-full items-center justify-center rounded-lg border border-dashed py-2 text-xs text-[var(--text-faint)] transition-colors ${theme.addBorder} ${theme.addBg}`}
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
                    <table className="w-full text-left text-sm text-[var(--text-primary)] whitespace-nowrap">
                        <thead className="sticky top-0 z-20 bg-[var(--surface-mid)] shadow-sm border-b border-white/10">
                            <tr className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                                <th onClick={(e) => openColumnFilter("sid", e)} className="py-3.5 pl-5 pr-2 font-semibold w-20 cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/></svg>
                                        ID <SortIndicator column="sid" />
                                    </div>
                                </th>
                                <th onClick={(e) => openColumnFilter("title", e)} className="py-3.5 px-4 font-semibold w-full min-w-[200px] sm:min-w-[280px] cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
                                        Task <SortIndicator column="title" />
                                        {filterTitle && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    </div>
                                </th>
                                <th onClick={(e) => openColumnFilter("status", e)} className="px-4 py-3.5 font-semibold cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
                                        Status <SortIndicator column="status" />
                                        {filterStatuses.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    </div>
                                </th>
                                <th onClick={(e) => openColumnFilter("assignee", e)} className="px-4 py-3.5 font-semibold cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors hidden sm:table-cell">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        Assignee <SortIndicator column="assignee" />
                                        {filterAssigneeIds.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    </div>
                                </th>
                                <th onClick={(e) => openColumnFilter("priority", e)} className="px-4 py-3.5 font-semibold cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors hidden md:table-cell">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                                        Priority <SortIndicator column="priority" />
                                        {filterPriorities.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    </div>
                                </th>
                                <th onClick={(e) => openColumnFilter("estimate", e)} className="px-4 py-3.5 font-semibold cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors hidden lg:table-cell">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        Deadline <SortIndicator column="estimate" />
                                        {filterDueDate && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    </div>
                                </th>
                                <th onClick={(e) => openColumnFilter("type", e)} className="px-4 py-3.5 font-semibold cursor-pointer select-none group hover:text-[var(--text-primary)] transition-colors hidden xl:table-cell">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
                                        Type <SortIndicator column="type" />
                                        {filterTypes.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />}
                                    </div>
                                </th>
                                <th className="py-3.5 pr-5 pl-4 font-semibold text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                        Actions
                                    </div>
                                </th>
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
                                        onClick={(e) => { e.stopPropagation(); handleOpenTicket(t._id); }}
                                        className={`group cursor-pointer transition-colors hover:bg-white/[0.03] ${
                                            t._id === selectedTicketId ? "bg-violet-500/[0.08]" : ""
                                        }`}
                                    >
                                        <td className="py-3.5 pl-5 pr-2">
                                            <span className="text-sm font-bold text-violet-400 shrink-0">US-{t.sid}</span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="font-medium max-w-[400px] truncate block">{t.title}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${COL_THEME[t.status]?.badge}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 hidden sm:table-cell">
                                            {assigneeName ? (
                                                <div className="flex items-center gap-2" title={assigneeName}>
                                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${avatarGradient(assigneeName)} text-[11px] font-bold ring-1 ring-white/15`}>
                                                        {assigneeName.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="truncate text-xs font-medium text-[var(--text-muted)]">
                                                        {assignees.length > 1 ? `${assigneeName} +${assignees.length - 1}` : assigneeName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-[var(--text-faint)] italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 hidden md:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[t.priority || "Medium"]?.replace("text-", "bg-") ?? "bg-zinc-500"}`} />
                                                <span className={`text-[11px] font-semibold ${PRIORITY_COLORS[t.priority || "Medium"] ?? "text-[var(--text-muted)]"}`}>
                                                    {t.priority || "Medium"}
                                                </span>
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-3.5 hidden lg:table-cell"
                                            onClick={(e) => { e.stopPropagation(); openDeadlinePicker(t._id, e.currentTarget); }}
                                        >
                                            {t.estimate ? (
                                                <span className={`group/dl flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${DEADLINE_TEXT_COLORS[getDeadlineStatus(t.estimate) ?? "ok"]}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                    {new Date(t.estimate.split('T')[0] + 'T12:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 opacity-0 group-hover/dl:opacity-60" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                </span>
                                            ) : (
                                                <span className="cursor-pointer text-xs text-white/20 italic hover:text-violet-400 transition-colors">+ Add deadline</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 hidden xl:table-cell">
                                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${TYPE_COLORS[t.type || "Task"] ?? TYPE_COLORS.Task}`}>
                                                {t.type || "Task"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-5 pl-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); archiveTicket(t._id, !showArchived); }}
                                                     className={`rounded-md p-1.5 transition-colors hover:bg-white/10 ${showArchived ? "text-warn" : "text-[var(--text-faint)] hover:text-[var(--text-primary)]"}`}
                                                     title={showArchived ? "Unarchive" : "Archive"}
                                                 >
                                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                                                         <path d="M22 10v6M2 10v6M6 4h12l2 6H4l2-6zM3 10h18v10H3V10z" />
                                                     </svg>
                                                 </button>
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); deleteTicket(t._id); }}
                                                     className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger/10 hover:text-danger"
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
                                            <TitleMentionInput
                                                autoFocus
                                                value={newTitle}
                                                onChange={setNewTitle}
                                                onEnter={() => void handleCreate("Todo")}
                                                onEscape={() => { setIsAdding(null); setPendingMentionIds([]); }}
                                                placeholder="Task title... (@ to mention)"
                                                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-white/30 outline-none"
                                                users={users}
                                                onMention={(u) => setPendingMentionIds((prev) => Array.from(new Set([...prev, u._id])))}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => void handleCreate("Todo")}
                                                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-violet-500"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => { setIsAdding(null); setPendingMentionIds([]); }}
                                                    className="px-2 py-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text-primary)]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAdding("Todo")}
                                            className="flex w-full items-center justify-center gap-2 px-5 py-3 text-xs font-medium text-[var(--text-faint)] hover:bg-white/[0.02] hover:text-[var(--text-muted)] transition-colors"
                                        >
                                            <span className="text-lg leading-none">+</span>
                                            Add card
                                        </button>
                                    )}
                                </td>
                            </tr>

                            {finalTickets.length === 0 && !isAdding && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-sm text-[var(--text-faint)]">
                                        No tasks found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Deadline picker ── */}
            {editingDeadlineId && typeof document !== "undefined" && createPortal(
                <>
                    <div className="fixed inset-0 z-[300]" onClick={() => setEditingDeadlineId(null)} />
                    <div
                        className="fixed z-[310] w-52 rounded-2xl border border-white/[0.12] bg-[rgba(18,18,20,0.97)] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.55)] "
                        style={{ top: editingDeadlinePos.top, left: editingDeadlinePos.left }}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Set Deadline</p>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date().toISOString().slice(0, 10);
                                    if (deadlineDateInputRef.current) deadlineDateInputRef.current.value = today;
                                    void updateDeadline(editingDeadlineId, new Date(today + "T12:00:00").toISOString());
                                }}
                                className="rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-400 transition-colors hover:bg-violet-500/10 hover:text-violet-300"
                            >
                                Today
                            </button>
                        </div>
                        <input
                            ref={deadlineDateInputRef}
                            type="date"
                            autoFocus
                            defaultValue={tickets.find((t) => t._id === editingDeadlineId)?.estimate?.split("T")[0] ?? ""}
                            onChange={(e) => {
                                if (e.target.value) {
                                    void updateDeadline(editingDeadlineId, new Date(e.target.value + "T12:00:00").toISOString());
                                }
                            }}
                            className="glass-input w-full py-1.5 text-sm [color-scheme:dark]"
                        />
                        {tickets.find((t) => t._id === editingDeadlineId)?.estimate && (
                            <button
                                type="button"
                                onClick={() => void updateDeadline(editingDeadlineId, null, true)}
                                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/35 bg-danger/15 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:border-danger/55 hover:bg-danger/25 hover:text-danger"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                Remove deadline
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* ── Column filter dropdown ── */}
            {activeColumnFilter && typeof document !== "undefined" && createPortal(
                <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setActiveColumnFilter(null)} />
                    <div
                        className="fixed z-[210] w-64 rounded-2xl border border-white/[0.12] bg-[rgba(18,18,20,0.97)] p-2 shadow-[0_16px_50px_rgba(0,0,0,0.55)] "
                        style={{ top: columnFilterPos.top, left: columnFilterPos.left }}
                    >
                        {/* Sort */}
                        <div className="mb-1.5">
                            <p className="px-2 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Sort</p>
                            <div className="flex gap-1 px-1">
                                <button
                                    type="button"
                                    onClick={() => sortBy(activeColumnFilter as keyof Ticket | "assignee", "asc")}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${sortConfig?.key === activeColumnFilter && sortConfig.direction === "asc" ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m18 15-6-6-6 6"/></svg>
                                    A → Z
                                </button>
                                <button
                                    type="button"
                                    onClick={() => sortBy(activeColumnFilter as keyof Ticket | "assignee", "desc")}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${sortConfig?.key === activeColumnFilter && sortConfig.direction === "desc" ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m6 9 6 6 6-6"/></svg>
                                    Z → A
                                </button>
                            </div>
                        </div>

                        {/* Filter — only for columns that support it */}
                        {activeColumnFilter !== "sid" && (
                            <div className="border-t border-white/[0.08] pt-1.5">
                                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Filter</p>

                                {activeColumnFilter === "title" && (
                                    <div className="px-1 pb-1">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Search tasks…"
                                            value={filterTitle}
                                            onChange={(e) => setFilterTitle(e.target.value)}
                                            className="glass-input w-full py-1.5 text-sm"
                                        />
                                        {filterTitle && (
                                            <button type="button" onClick={() => setFilterTitle("")} className="mt-1 text-[11px] text-[var(--text-faint)] hover:text-[var(--text-primary)]">Clear</button>
                                        )}
                                    </div>
                                )}

                                {activeColumnFilter === "status" && (
                                    <div className="space-y-0.5 px-1 pb-1">
                                        {(["Todo", "In progress", "Done", "Blocked"] as Ticket["status"][]).map((s) => (
                                            <button key={s} type="button" onClick={() => toggleStatusFilter(s)}
                                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${filterStatuses.includes(s) ? "bg-violet-500/20 text-[var(--text-primary)] ring-1 ring-violet-400/25" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}>
                                                <span className={`h-2 w-2 rounded-full ${COL_THEME[s]?.dot}`} />
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeColumnFilter === "assignee" && (
                                    <div className="max-h-48 space-y-0.5 overflow-y-auto px-1 pb-1">
                                        {users.map((u) => {
                                            const name = u.name || u.email.split("@")[0];
                                            const active = filterAssigneeIds.includes(u._id);
                                            return (
                                                <button key={u._id} type="button" onClick={() => toggleAssigneeFilter(u._id)}
                                                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${active ? "bg-violet-500/20 text-[var(--text-primary)] ring-1 ring-violet-400/25" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}>
                                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${avatarGradient(name)} text-[11px] font-bold`}>
                                                        {name.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="truncate">{name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {activeColumnFilter === "priority" && (
                                    <div className="space-y-0.5 px-1 pb-1">
                                        {["Highest", "High", "Medium", "Low", "Lowest"].map((p) => (
                                            <button key={p} type="button" onClick={() => togglePriorityFilter(p)}
                                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${filterPriorities.includes(p) ? "bg-violet-500/20 text-[var(--text-primary)] ring-1 ring-violet-400/25" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[p]?.replace("text-", "bg-") ?? "bg-zinc-500"}`} />
                                                <span className={PRIORITY_COLORS[p]}>{p}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeColumnFilter === "estimate" && (
                                    <div className="space-y-2 px-1 pb-1">
                                        <input
                                            type="date"
                                            value={filterDueDate}
                                            onChange={(e) => setFilterDueDate(e.target.value)}
                                            className="glass-input w-full py-1.5 text-sm [color-scheme:dark]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFilterPastDue((v) => !v)}
                                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${filterPastDue ? "border-danger/40 bg-danger/15 text-danger" : "border-white/10 text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}
                                        >
                                            {filterPastDue ? "Past due only: ON" : "Past due only: OFF"}
                                        </button>
                                        {(filterDueDate || filterPastDue) && (
                                            <button type="button" onClick={() => { setFilterDueDate(""); setFilterPastDue(false); }} className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text-primary)]">Clear</button>
                                        )}
                                    </div>
                                )}

                                {activeColumnFilter === "type" && (
                                    <div className="space-y-0.5 px-1 pb-1">
                                        {(["Task", "Bug", "Story", "Epic"] as const).map((tp) => (
                                            <button key={tp} type="button" onClick={() => toggleTypeFilter(tp)}
                                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${filterTypes.includes(tp) ? "bg-violet-500/20 text-[var(--text-primary)] ring-1 ring-violet-400/25" : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"}`}>
                                                <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-bold uppercase ${TYPE_COLORS[tp]}`}>{tp}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* ── Ticket Detail Panel ── */}
            {selectedTicketId && (
                <>
                    {/* Scrim: clicks bubble to the board wrapper, which saves and closes */}
                    <div className="fixed inset-0 z-[340] bg-black/50 animate-in fade-in duration-200" aria-hidden />
                    {/* Panel */}
                    <div
                        role="dialog"
                        aria-label="Ticket details"
                        className="fixed inset-y-0 right-0 z-[350] flex w-full flex-col border-l border-[var(--glass-border-bright)] bg-[var(--surface-mid)] shadow-[-24px_0_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300 md:w-[min(56vw,820px)]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute inset-x-0 top-0 z-10 h-[2px] bg-[var(--accent)]" />

                        {/* Content */}
                        <div className="relative h-full overflow-hidden">
                            <TicketDetail
                                ticketId={selectedTicketId}
                                onClose={handleCloseModal}
                                flushRef={ticketFlushRef}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
