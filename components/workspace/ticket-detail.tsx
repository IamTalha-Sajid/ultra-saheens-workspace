"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useFeedback } from "@/components/ui/feedback-provider";
import { useSession } from "next-auth/react";
import { createUserMentionExtension } from "./user-mention-extension";

type User = {
    _id: string;
    name: string;
    email: string;
    username?: string;
};

type Comment = {
    _id: string;
    content: string;
    authorId: User;
    createdAt: string;
};

type Ticket = {
    _id: string;
    sid: number;
    title: string;
    description: string;
    status: "Todo" | "In progress" | "Blocked" | "Done";
    priority: "Highest" | "High" | "Medium" | "Low" | "Lowest";
    type: "Task" | "Bug" | "Story" | "Epic";
    labels: string[];
    estimate: string;
    assigneeId?: User | string | null;
    assigneeIds?: User[] | string[];
    creatorId: User;
    createdAt: string;
};

/* ── SVG Icon components ── */

function ArrowLeftIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
        </svg>
    );
}

function ChatIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
    );
}

function TagIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
            <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
        </svg>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function FlagIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
        </svg>
    );
}

function LayersIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
    );
}

function SignalIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
        </svg>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    );
}

function PencilIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
            <path d="m15 5 4 4"/>
        </svg>
    );
}

function extractCommentText(content: string): string {
    if (!content.startsWith('{"type":"doc"')) return content;
    try {
        type TipTapNode = { text?: string; content?: TipTapNode[] };
        const walk = (node: TipTapNode): string => {
            if (node.text) return node.text;
            if (node.content) return node.content.map(walk).join('');
            return '';
        };
        return walk(JSON.parse(content) as TipTapNode).trim();
    } catch { return content; }
}

/* ── Colours ── */

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

const STATUS_COLORS: Record<string, string> = {
    Todo: "bg-neutral/15 text-neutral border-neutral/25",
    "In progress": "bg-warn/15 text-warn border-warn/25",
    Done: "bg-ok/15 text-ok border-ok/25",
    Blocked: "bg-danger/15 text-danger border-danger/25",
};

const STATUS_DOT: Record<string, string> = {
    Todo: "bg-neutral",
    "In progress": "bg-warn",
    Done: "bg-ok",
    Blocked: "bg-danger",
};

const PRIORITY_DOT: Record<string, string> = {
    Highest: "bg-danger",
    High: "bg-orange-400",
    Medium: "bg-warn",
    Low: "bg-info",
    Lowest: "bg-neutral",
};

function deadlineInfo(estimate?: string): { label: string; tone: string } | null {
    if (!estimate) return null;
    const due = new Date(estimate.split("T")[0] + "T23:59:59");
    const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, tone: "text-danger" };
    if (days === 0) return { label: "Due today", tone: "text-warn" };
    if (days <= 3) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, tone: "text-warn" };
    return { label: `Due in ${days} days`, tone: "text-[var(--text-muted)]" };
}

const COLUMNS = ["Todo", "In progress", "Done", "Blocked"];

/* ── Component ── */

export function TicketDetail({ ticketId, onClose, flushRef }: {
    ticketId: string;
    onClose?: (hasChanges?: boolean) => void;
    /** Parent can call `flushRef.current()` before force-closing (e.g. backdrop click) to flush any pending autosave. */
    flushRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}) {
    const router = useRouter();
    const { data: session } = useSession();
    const { confirm } = useFeedback();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [originalTicket, setOriginalTicket] = useState<Ticket | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [originalComments, setOriginalComments] = useState<Comment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSwitchingTicket, setIsSwitchingTicket] = useState(false);
    const [commentEmpty, setCommentEmpty] = useState(true);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
    const [hasPersistedChanges, setHasPersistedChanges] = useState(false);
    const [postingComment, setPostingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [savingCommentEdit, setSavingCommentEdit] = useState(false);
    const [assigneeQuery, setAssigneeQuery] = useState("");
    const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);

    const normalizeAssigneeIds = (assigneeId: Ticket["assigneeId"], assigneeIds?: Ticket["assigneeIds"]): string[] => {
        if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
            return assigneeIds
                .map((x) => (typeof x === "string" ? x : x?._id || ""))
                .filter(Boolean)
                .sort();
        }
        if (!assigneeId) return [];
        const single = typeof assigneeId === "string" ? assigneeId : assigneeId._id || "";
        return single ? [single] : [];
    };

    const hasUnsavedTicketChanges = useMemo(() => {
        if (!ticket || !originalTicket) return false;
        return (
            ticket.title !== originalTicket.title ||
            ticket.description !== originalTicket.description ||
            ticket.status !== originalTicket.status ||
            ticket.priority !== originalTicket.priority ||
            ticket.type !== originalTicket.type ||
            ticket.estimate !== originalTicket.estimate ||
            JSON.stringify(normalizeAssigneeIds(ticket.assigneeId, ticket.assigneeIds)) !==
            JSON.stringify(normalizeAssigneeIds(originalTicket.assigneeId, originalTicket.assigneeIds)) ||
            JSON.stringify(ticket.labels) !== JSON.stringify(originalTicket.labels)
        );
    }, [ticket, originalTicket]);

    const selectedAssigneeIds = useMemo(
        () => (ticket ? normalizeAssigneeIds(ticket.assigneeId, ticket.assigneeIds) : []),
        [ticket?.assigneeId, ticket?.assigneeIds]
    );

    const selectedAssignees = useMemo(
        () => users.filter((u) => selectedAssigneeIds.includes(u._id)),
        [users, selectedAssigneeIds]
    );

    const assigneeOptions = useMemo(() => {
        const q = assigneeQuery.trim().toLowerCase();
        return users.filter((u) => {
            if (selectedAssigneeIds.includes(u._id)) return false;
            if (!q) return true;
            const name = (u.name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const username = (u.username || "").toLowerCase();
            return name.includes(q) || email.includes(q) || username.includes(q);
        });
    }, [users, selectedAssigneeIds, assigneeQuery]);

    const toggleAssignee = (userId: string) => {
        if (!ticket) return;
        const next = selectedAssigneeIds.includes(userId)
            ? selectedAssigneeIds.filter((id) => id !== userId)
            : [...selectedAssigneeIds, userId];
        updateField("assigneeIds", next);
        updateField("assigneeId", next[0] ?? "");
    };

    const commentEditor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: "Write a comment… (Use @ to mention someone)" }),
            createUserMentionExtension(),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "tiptap-editor min-h-[80px] outline-none text-sm text-[var(--text-primary)] p-0"
            }
        },
        onUpdate: ({ editor }) => {
            setCommentEmpty(editor.isEmpty);
        }
    });

    const titleEditor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                listItem: false,
                bulletList: false,
                orderedList: false,
                codeBlock: false,
                blockquote: false,
                horizontalRule: false,
                hardBreak: false,
            }),
            Placeholder.configure({ placeholder: "Enter issue summary…" }),
            createUserMentionExtension(),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "tiptap-editor w-full bg-transparent text-2xl font-bold leading-tight tracking-tight text-[var(--text-primary)] outline-none ring-0 md:text-3xl"
            },
            handleKeyDown: (view, event) => {
                // Prevent Enter from creating new lines in title
                if (event.key === 'Enter') {
                    event.preventDefault();
                    return true;
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            const content = editor.getText().trim();
            setTicket(prev => prev ? { ...prev, title: content } : null);
        }
    });

    const fetchTicket = async () => {
        try {
            const [tRes, uRes] = await Promise.all([
                fetch(`/api/tickets/${ticketId}`),
                fetch("/api/users"),
            ]);
            if (tRes.ok) {
                const data = await tRes.json();
                const t = data.ticket;
                const ticketData = {
                    ...t,
                    sid: t.sid,
                    labels: t.labels ?? [],
                    priority: t.priority ?? "Medium",
                    type: t.type ?? "Task",
                    estimate: t.estimate ?? "",
                    assigneeIds: (t.assigneeIds && t.assigneeIds.length > 0)
                        ? t.assigneeIds
                        : (t.assigneeId ? [t.assigneeId] : []),
                };
                setTicket(ticketData);
                setOriginalTicket(JSON.parse(JSON.stringify(ticketData))); // Deep copy
                setComments(data.comments || []);
                setOriginalComments(JSON.parse(JSON.stringify(data.comments || []))); // Deep copy
                // Set title editor content
                if (titleEditor) {
                    titleEditor.commands.setContent(ticketData.title || "");
                }
            }
            if (uRes.ok) {
                const { users } = await uRes.json();
                setUsers(users);
            }
        } finally {
            setLoading(false);
            setIsSwitchingTicket(false);
        }
    };

    useEffect(() => {
        setIsSwitchingTicket(true);
        void fetchTicket();
    }, [ticketId]);

    useEffect(() => {
        if (!titleEditor || !ticket) return;
        // While typing, the editor is the source of truth; resetting its content
        // here moves the caret to the end and scrolls the page.
        if (titleEditor.isFocused) return;
        const nextTitle = ticket.title || "";
        if (titleEditor.getText().trim() !== nextTitle) {
            titleEditor.commands.setContent(nextTitle);
        }
    }, [titleEditor, ticket?._id, ticket?.title]);

    useEffect(() => {
        return () => {
            commentEditor?.destroy();
            titleEditor?.destroy();
        };
    }, [commentEditor, titleEditor]);

    const updateField = (field: keyof Ticket, value: any) => {
        setTicket((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSaveAll = useCallback(async () => {
        if (!ticket) return;
        setSaveState("saving");
        const res = await fetch(`/api/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                type: ticket.type,
                labels: ticket.labels,
                estimate: ticket.estimate,
                assigneeIds: normalizeAssigneeIds(ticket.assigneeId, ticket.assigneeIds),
            }),
        });
        if (res.ok) {
            const payload = await res.json();
            const savedTicket = payload?.ticket
                ? {
                    ...payload.ticket,
                    sid: payload.ticket.sid,
                    labels: payload.ticket.labels ?? [],
                    priority: payload.ticket.priority ?? "Medium",
                    type: payload.ticket.type ?? "Task",
                    estimate: payload.ticket.estimate ?? "",
                }
                : ticket;
            setTicket(savedTicket);
            setOriginalTicket(JSON.parse(JSON.stringify(savedTicket)));
            setSaveState("saved");
            setHasPersistedChanges(true);
            setTimeout(() => setSaveState("idle"), 2500);
        } else {
            setSaveState("idle");
        }
    }, [ticket, ticketId]);

    useEffect(() => {
        if (!hasUnsavedTicketChanges || saveState === "saving") return;
        const timer = setTimeout(() => { void handleSaveAll(); }, 900);
        return () => clearTimeout(timer);
    }, [ticket, hasUnsavedTicketChanges, saveState, handleSaveAll]);

    const flushPendingSave = useCallback(async () => {
        if (hasUnsavedTicketChanges) {
            await handleSaveAll();
        }
    }, [hasUnsavedTicketChanges, handleSaveAll]);

    useEffect(() => {
        if (!flushRef) return;
        flushRef.current = flushPendingSave;
        return () => {
            if (flushRef.current === flushPendingSave) flushRef.current = null;
        };
    }, [flushRef, flushPendingSave]);

    const requestClose = useCallback(async () => {
        if (!onClose) return;
        if (hasUnsavedTicketChanges) {
            await handleSaveAll();
            onClose(true);
        } else {
            onClose(hasPersistedChanges);
        }
    }, [onClose, hasUnsavedTicketChanges, hasPersistedChanges, handleSaveAll]);

    useEffect(() => {
        if (!onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || e.defaultPrevented) return;
            const el = e.target as HTMLElement | null;
            if (el && (el.closest("input, textarea, select, [contenteditable='true']") || el.closest("[aria-expanded='true']"))) return;
            void requestClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, requestClose]);

    const handlePostComment = async () => {
        if (!commentEditor || postingComment) return;
        const html = commentEditor.getHTML();
        if (html === "<p></p>" || !commentEditor.getText().trim()) return;

        const contentToSave = JSON.stringify(commentEditor.getJSON());

        setPostingComment(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: contentToSave }),
            });
            if (res.ok) {
                const data = await res.json();
                setComments((prev) => [data.comment, ...prev]);
                setHasPersistedChanges(true);
                commentEditor.commands.clearContent(true);
                setCommentEmpty(true);
            }
        } finally {
            setPostingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        const ok = await confirm({
            title: "Delete Comment?",
            message: "This will permanently remove your comment from the ticket history.",
            confirmLabel: "Delete",
            destructive: true,
        });
        if (!ok) return;
        setDeletingCommentId(commentId);
        try {
            const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setComments((prev) => prev.filter((c) => c._id !== commentId));
                setHasPersistedChanges(true);
            }
        } finally {
            setDeletingCommentId(null);
        }
    };

    const handleStartEditComment = (commentId: string, content: string) => {
        setEditingCommentId(commentId);
        setEditingCommentText(extractCommentText(content));
    };

    const handleCancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText("");
    };

    const handleSaveEditComment = async () => {
        if (!editingCommentId || !editingCommentText.trim()) return;
        setSavingCommentEdit(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}/comments/${editingCommentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: editingCommentText.trim() }),
            });
            if (res.ok) {
                setComments((prev) =>
                    prev.map((c) =>
                        c._id === editingCommentId ? { ...c, content: editingCommentText.trim() } : c
                    )
                );
                setEditingCommentId(null);
                setEditingCommentText("");
                setHasPersistedChanges(true);
            }
        } finally {
            setSavingCommentEdit(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
        );
    }
    if (!ticket) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Ticket not found</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    The ticket you are looking for does not exist or has been deleted.
                </p>
                {onClose ? (
                    <button onClick={() => void requestClose()} className="glass-button-primary w-auto px-6">
                        Close
                    </button>
                ) : (
                    <Link href="/app/board" className="glass-button-primary w-auto px-6">
                        Return to Board
                    </Link>
                )}
            </div>
        );
    }

    const dl = deadlineInfo(ticket.estimate);

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--surface-mid)]">
            {isSwitchingTicket && !loading && (
                <div className="absolute inset-0 z-[30] flex items-center justify-center bg-black/40">
                    <div className="glass-panel flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-primary)] shadow-2xl" role="status">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                        Loading ticket…
                    </div>
                </div>
            )}

            {/* ── Sticky header ── */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    {onClose ? (
                        <button
                            onClick={() => void requestClose()}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                            aria-label="Close ticket"
                            title="Close (Esc)"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <Link
                            href="/app/board"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                            aria-label="Back to board"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                    )}
                    <span className="font-[family-name:var(--font-barlow-condensed)] text-lg font-bold tracking-wider text-[var(--accent)]">
                        US-{ticket.sid}
                    </span>
                    <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TYPE_COLORS[ticket.type] ?? TYPE_COLORS.Task}`}>
                        {ticket.type}
                    </span>
                </div>

                {/* Fixed width, always rendered: appearing/disappearing would shift the header */}
                <span
                    role="status"
                    aria-live="polite"
                    className={`flex w-[72px] shrink-0 items-center justify-end gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--text-faint)] ${saveState === "saving" || saveState === "saved" ? "" : "invisible"}`}
                >
                    {saveState === "saving" ? (
                        <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
                            Saving…
                        </>
                    ) : (
                        <>
                            <CheckCircleIcon className="h-3.5 w-3.5 text-ok" />
                            Saved
                        </>
                    )}
                </span>
            </header>

            {/* ── Scrollable body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 md:py-8">
                    {/* Title */}
                    <div>
                        {titleEditor ? (
                            <EditorContent editor={titleEditor} />
                        ) : (
                            <div className="w-full text-2xl font-bold leading-tight tracking-tight text-[var(--text-primary)] md:text-3xl">
                                {ticket.title || "Enter issue summary…"}
                            </div>
                        )}
                    </div>

                    {/* Properties */}
                    <section aria-label="Ticket properties" className="grid grid-cols-1 gap-x-6 gap-y-5 border-y border-[var(--glass-border)] py-6 sm:grid-cols-2">
                        <DetailRow icon={<SignalIcon className="h-4 w-4" />} label="Status">
                            <CustomSelect
                                value={ticket.status}
                                options={COLUMNS.map(c => ({ value: c, label: c }))}
                                onChange={(val) => updateField("status", val)}
                                variant="status"
                            />
                        </DetailRow>

                        <DetailRow icon={<FlagIcon className="h-4 w-4" />} label="Priority">
                            <CustomSelect
                                value={ticket.priority}
                                options={["Highest", "High", "Medium", "Low", "Lowest"].map(p => ({ value: p, label: p }))}
                                onChange={(val) => updateField("priority", val)}
                                variant="priority"
                            />
                        </DetailRow>

                        <DetailRow icon={<LayersIcon className="h-4 w-4" />} label="Issue type">
                            <CustomSelect
                                value={ticket.type}
                                options={["Task", "Story", "Bug", "Epic"].map(t => ({ value: t, label: t }))}
                                onChange={(val) => updateField("type", val)}
                            />
                        </DetailRow>

                        <DetailRow icon={<ClockIcon className="h-4 w-4" />} label="Deadline" htmlFor="ticket-deadline">
                            <div className="flex items-center gap-2">
                                <input
                                    id="ticket-deadline"
                                    type="date"
                                    value={ticket.estimate ? ticket.estimate.split('T')[0] : ""}
                                    onChange={(e) => {
                                        setTicket({ ...ticket, estimate: e.target.value });
                                    }}
                                    className="glass-input min-w-0 flex-1 cursor-pointer py-2.5 text-sm [color-scheme:dark]"
                                />
                                {(() => {
                                    const now = new Date();
                                    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                                    const isToday = ticket.estimate?.split('T')[0] === today;
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setTicket({ ...ticket, estimate: today })}
                                            disabled={isToday}
                                            title="Set deadline to today"
                                            className="glass-button shrink-0 py-2.5 disabled:cursor-default disabled:opacity-40"
                                        >
                                            Today
                                        </button>
                                    );
                                })()}
                            </div>
                            {dl && (
                                <p className={`mt-1 text-xs font-medium ${dl.tone}`}>{dl.label}</p>
                            )}
                        </DetailRow>

                        <div className="sm:col-span-2">
                            <DetailRow icon={<UserIcon className="h-4 w-4" />} label="Assignees">
                                <div className="relative">
                                    <div className="glass-panel flex min-h-[42px] flex-wrap items-center gap-2 px-2.5 py-2 focus-within:border-[var(--accent)]">
                                        {selectedAssignees.map((u) => {
                                            const label = u.name || u.email.split("@")[0];
                                            return (
                                                <span key={u._id} className="inline-flex items-center gap-1.5 rounded-sm border border-violet-400/30 bg-violet-400/10 py-1 pl-2 pr-1 text-xs text-[var(--text-primary)]">
                                                    <span className="max-w-[160px] truncate">{label}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAssignee(u._id)}
                                                        className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                                                        aria-label={`Remove ${label}`}
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        <input
                                            value={assigneeQuery}
                                            onFocus={() => setAssigneeMenuOpen(true)}
                                            onChange={(e) => {
                                                setAssigneeQuery(e.target.value);
                                                setAssigneeMenuOpen(true);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace" && !assigneeQuery && selectedAssigneeIds.length > 0) {
                                                    const last = selectedAssigneeIds[selectedAssigneeIds.length - 1];
                                                    toggleAssignee(last);
                                                }
                                                if (e.key === "Escape") setAssigneeMenuOpen(false);
                                            }}
                                            aria-label="Search assignees"
                                            placeholder={selectedAssigneeIds.length === 0 ? "Unassigned. Search to add…" : "Add more…"}
                                            className="min-w-[120px] flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
                                        />
                                    </div>

                                    {assigneeMenuOpen && (
                                        <div className="absolute left-0 right-0 z-[120] mt-1 max-h-52 overflow-y-auto rounded-sm border border-[var(--glass-border-bright)] bg-[var(--surface-overlay)] p-1 shadow-2xl">
                                            {assigneeOptions.length === 0 ? (
                                                <p className="px-2 py-2 text-xs text-[var(--text-faint)]">No matching users.</p>
                                            ) : (
                                                assigneeOptions.map((u) => {
                                                    const label = u.name || u.email.split("@")[0];
                                                    return (
                                                        <button
                                                            key={u._id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                toggleAssignee(u._id);
                                                                setAssigneeQuery("");
                                                                setAssigneeMenuOpen(true);
                                                            }}
                                                            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-white/[0.06]"
                                                        >
                                                            <span className="truncate">{label}</span>
                                                            <span className="ml-2 truncate text-xs text-[var(--text-faint)]">{u.email}</span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {assigneeMenuOpen && (
                                        <button
                                            type="button"
                                            aria-label="Close assignee menu"
                                            tabIndex={-1}
                                            className="fixed inset-0 z-[110] cursor-default"
                                            onClick={() => setAssigneeMenuOpen(false)}
                                        />
                                    )}
                                </div>
                            </DetailRow>
                        </div>

                        <div className="sm:col-span-2">
                            <DetailRow icon={<TagIcon className="h-4 w-4" />} label="Labels" htmlFor="ticket-label-input">
                                <div className="flex flex-wrap items-center gap-2">
                                    {ticket.labels.map((l) => (
                                        <span
                                            key={l}
                                            className="inline-flex items-center gap-1 rounded-sm border border-[var(--glass-border-bright)] py-1 pl-2.5 pr-1 text-xs font-medium text-[var(--text-primary)]"
                                        >
                                            {l}
                                            <button
                                                onClick={() => {
                                                    const next = ticket.labels.filter((x) => x !== l);
                                                    updateField("labels", next);
                                                }}
                                                className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                                                aria-label={`Remove label ${l}`}
                                            >
                                                <XIcon className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        id="ticket-label-input"
                                        type="text"
                                        placeholder={ticket.labels.length === 0 ? "Add a label, press Enter…" : "Add label…"}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const val = (e.target as HTMLInputElement).value.trim();
                                                if (val && !ticket.labels.includes(val)) {
                                                    updateField("labels", [...ticket.labels, val]);
                                                    (e.target as HTMLInputElement).value = "";
                                                }
                                            }
                                        }}
                                        className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
                                    />
                                </div>
                            </DetailRow>
                        </div>

                        <p className="text-xs text-[var(--text-faint)] sm:col-span-2">
                            Reported by{" "}
                            <span className="font-medium text-[var(--text-muted)]">
                                {ticket.creatorId.name || ticket.creatorId.email}
                            </span>
                        </p>
                    </section>

                    {/* Description */}
                    <section className="flex flex-col gap-3">
                        <label htmlFor="ticket-description" className="text-lg font-bold text-[var(--text-primary)]">
                            Description
                        </label>
                        <textarea
                            id="ticket-description"
                            className="glass-input min-h-[160px] w-full resize-y p-4 text-[15px] leading-relaxed"
                            placeholder="What needs to be done? Add all details here…"
                            value={ticket.description}
                            onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                        />
                    </section>

                    {/* Activity */}
                    <section className="flex flex-col gap-5" aria-labelledby="ticket-activity">
                        <h2 id="ticket-activity" className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                            Activity
                            {comments.length > 0 && (
                                <span className="rounded-sm border border-[var(--glass-border-bright)] px-1.5 text-xs font-semibold text-[var(--text-muted)]">
                                    {comments.length}
                                </span>
                            )}
                        </h2>

                        <div className="flex flex-col gap-4">
                            {comments.map((c) => {
                                const isEditing = editingCommentId === c._id;
                                const isOwn = session?.user?.id === c.authorId._id;
                                const authorName = c.authorId.name || c.authorId.email;
                                return (
                                    <div key={c._id} className="group flex gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-xs font-bold text-violet-400" aria-hidden>
                                            {authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-semibold text-[var(--text-primary)]">{authorName}</span>
                                                <time className="text-xs text-[var(--text-faint)]" dateTime={c.createdAt}>
                                                    {new Date(c.createdAt).toLocaleString(undefined, {
                                                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                                    })}
                                                </time>
                                                {isOwn && !isEditing && (
                                                    <span className="ml-auto flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                                                        <button
                                                            onClick={() => handleStartEditComment(c._id, c.content)}
                                                            className="rounded-sm p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                                                            aria-label="Edit comment"
                                                            title="Edit comment"
                                                        >
                                                            <PencilIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => void handleDeleteComment(c._id)}
                                                            disabled={deletingCommentId === c._id}
                                                            className="rounded-sm p-1.5 text-[var(--text-muted)] hover:bg-danger/10 hover:text-danger"
                                                            aria-label="Delete comment"
                                                            title="Delete comment"
                                                        >
                                                            {deletingCommentId === c._id ? (
                                                                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                            ) : (
                                                                <XIcon className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2">
                                                    <textarea
                                                        value={editingCommentText}
                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") handleCancelEditComment();
                                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSaveEditComment();
                                                        }}
                                                        autoFocus
                                                        rows={3}
                                                        aria-label="Edit comment"
                                                        className="glass-input w-full resize-none py-2 text-sm leading-relaxed"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => void handleSaveEditComment()}
                                                            disabled={savingCommentEdit || !editingCommentText.trim()}
                                                            className="glass-button-primary px-3 py-1.5 text-sm disabled:opacity-50"
                                                        >
                                                            {savingCommentEdit ? "Saving…" : "Save"}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEditComment}
                                                            className="glass-button px-3 py-1.5"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <span className="text-xs text-[var(--text-faint)]">Ctrl+Enter to save</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <CommentRenderer content={c.content} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {comments.length === 0 && (
                                <p className="border border-dashed border-[var(--glass-border-bright)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                                    No comments yet. Start the conversation below.
                                </p>
                            )}
                        </div>

                        {/* Composer */}
                        <div className="flex flex-col gap-3 border border-[var(--glass-border)] bg-[var(--surface-deep)] p-3 transition-colors focus-within:border-[var(--accent)]">
                            <div className="min-h-[80px] w-full cursor-text text-sm text-[var(--text-primary)]">
                                <EditorContent editor={commentEditor} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-[var(--text-faint)]">Type @ to mention someone</span>
                                <button
                                    onClick={handlePostComment}
                                    disabled={commentEmpty || postingComment}
                                    className="glass-button-primary px-4 py-1.5 text-sm"
                                >
                                    {postingComment ? "Posting…" : "Comment"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

/* ── Reusable detail-row wrapper ── */

function DetailRow({
    icon,
    label,
    htmlFor,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
}) {
    const cls = "eyebrow flex items-center gap-2 text-[var(--text-muted)]";
    return (
        <div className="flex flex-col gap-2">
            {htmlFor ? (
                <label htmlFor={htmlFor} className={cls}>{icon}{label}</label>
            ) : (
                <span className={cls}>{icon}{label}</span>
            )}
            {children}
        </div>
    );
}

/* ── Reusable Component for Comments ── */

function CommentRenderer({ content }: { content: string }) {
    const isJson = content.startsWith('{"type":"doc"');

    const editor = useEditor({
        immediatelyRender: false,
        editable: false,
        extensions: [StarterKit, createUserMentionExtension()],
        content: isJson ? JSON.parse(content) : content,
        editorProps: {
            attributes: {
                class: "tiptap-editor text-[14px] leading-relaxed text-[var(--text-muted)] focus:outline-none"
            }
        }
    }, [content]);

    if (!isJson) {
        return <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-muted)]">{content}</p>;
    }

    return <EditorContent editor={editor} />;
}

/* ── Custom Premium Select Component ── */

function CustomSelect({
    value,
    options,
    onChange,
    variant
}: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
    variant?: "status" | "priority";
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    let displayClass = "glass-panel flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05]";
    if (variant === "status" && STATUS_COLORS[value]) {
        displayClass = `${displayClass} ${STATUS_COLORS[value]} border`;
    } else if (variant === "priority" && PRIORITY_COLORS[value]) {
        displayClass = `${displayClass} text-[var(--text-primary)] border border-[var(--glass-border-bright)]`;
    } else {
        displayClass = `${displayClass} text-[var(--text-primary)] border border-white/10`;
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => { if (e.key === "Escape" && isOpen) { e.stopPropagation(); setIsOpen(false); } }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={displayClass}
            >
                <span className="font-medium">
                    {variant === "priority" && (
                        <span className={`mr-2 inline-block h-2 w-2 rounded-full ${PRIORITY_DOT[value]}`} />
                    )}
                    {selectedOption?.label}
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-4 w-4 text-[var(--text-faint)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 z-[100] mt-2 max-h-60 overflow-y-auto rounded-sm border border-[var(--glass-border-bright)] bg-[var(--surface-overlay)] p-1 shadow-2xl animate-in fade-in duration-150">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`flex w-full items-center rounded-sm px-3 py-2 text-sm transition-colors ${opt.value === value
                                ? "bg-violet-400/10 text-[var(--text-primary)] font-semibold"
                                : "text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            {variant === "status" && (
                                <span className={`mr-2 h-2 w-2 rounded-full ${STATUS_DOT[opt.value]}`} />
                            )}
                            {variant === "priority" && (
                                <span className={`mr-2 h-2 w-2 rounded-full ${PRIORITY_DOT[opt.value]}`} />
                            )}
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
