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

function SaveIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" />
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

/* ── Colours ── */

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

const STATUS_COLORS: Record<string, string> = {
    Todo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    "In progress": "bg-amber-500/15 text-amber-300 border-amber-500/25",
    Done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    Blocked: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

const COLUMNS = ["Todo", "In progress", "Done", "Blocked"];

/* ── Component ── */

export function TicketDetail({ ticketId, onClose }: { ticketId: string; onClose?: () => void }) {
    const router = useRouter();
    const { data: session } = useSession();
    const { confirm } = useFeedback();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentEmpty, setCommentEmpty] = useState(true);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

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
                class: "tiptap-editor min-h-[100px] outline-none text-sm text-[var(--text-muted)] p-0"
            }
        },
        onUpdate: ({ editor }) => {
            setCommentEmpty(editor.isEmpty);
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
                setTicket({
                    ...t,
                    sid: t.sid,
                    labels: t.labels ?? [],
                    priority: t.priority ?? "Medium",
                    type: t.type ?? "Task",
                    estimate: t.estimate ?? "",
                });
                setComments(data.comments || []);
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
        void fetchTicket();
    }, [ticketId]);

    const updateField = (field: keyof Ticket, value: any) => {
        if (!ticket) return;
        setTicket({ ...ticket, [field]: value });
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
                assigneeId: typeof ticket.assigneeId === 'string' ? ticket.assigneeId || null : ticket.assigneeId?._id || null,
            }),
        });
        if (res.ok) {
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 2500);
        } else {
            setSaveState("idle");
        }
    }, [ticket, ticketId]);

    const handlePostComment = async () => {
        if (!commentEditor) return;
        const html = commentEditor.getHTML();
        if (html === "<p></p>" || !commentEditor.getText().trim()) return;

        const contentToSave = JSON.stringify(commentEditor.getJSON());

        const res = await fetch(`/api/tickets/${ticketId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: contentToSave }),
        });
        if (res.ok) {
            const data = await res.json();
            setComments((prev) => [...prev, data.comment]);
            commentEditor.commands.clearContent(true);
            setCommentEmpty(true);
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
        const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
            method: "DELETE",
        });
        if (res.ok) {
            setComments((prev) => prev.filter((c) => c._id !== commentId));
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
                <h2 className="text-xl font-bold text-white">Ticket not found</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    The ticket you are looking for does not exist or has been deleted.
                </p>
                {onClose ? (
                    <button onClick={onClose} className="glass-button-primary w-auto px-6">
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

    return (
        <div className="flex h-full w-full flex-col gap-4 overflow-y-auto pb-4 lg:flex-row lg:gap-6 lg:pb-6">
            {/* ── Main Content ── */}
            <div className="glass-card flex flex-1 flex-col gap-6 rounded-3xl p-4 shadow-2xl sm:p-6 md:p-8 lg:p-10">
                {/* Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {onClose ? (
                        <button
                            onClick={onClose}
                            className="group flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-white"
                        >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/10">
                                <span className="text-lg leading-none">×</span>
                            </span>
                            Close Detail
                        </button>
                    ) : (
                        <Link
                            href="/app/board"
                            className="group flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-white"
                        >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/10">
                                <ArrowLeftIcon className="h-4 w-4" />
                            </span>
                            Back to Board
                        </Link>
                    )}

                    <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${TYPE_COLORS[ticket.type] ?? TYPE_COLORS.Task}`}>
                            {ticket.type}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[ticket.status] ?? STATUS_COLORS.Todo}`}>
                            {ticket.status}
                        </span>
                        {ticket.estimate && (
                            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-rose-300 shadow-sm" title="Deadline">
                                <ClockIcon className="h-3.5 w-3.5" />
                                {new Date(ticket.estimate.split('T')[0] + 'T12:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                        )}

                        {/* Save Button */}
                        <button
                            type="button"
                            onClick={() => void handleSaveAll()}
                            disabled={saveState === "saving"}
                            className="ml-2 flex items-center gap-2 rounded-xl border border-violet-500/40 bg-gradient-to-b from-violet-600 to-violet-800 px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(139,92,246,0.25)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saveState === "saving" ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving…
                                </>
                            ) : saveState === "saved" ? (
                                <>
                                    <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                                    Saved
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="h-4 w-4" />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-widest text-violet-400/80">US-{ticket.sid}</span>
                    </div>
                    <input
                        type="text"
                        className="w-full bg-transparent text-3xl font-bold tracking-tight text-white outline-none ring-0 placeholder-[var(--text-muted)] transition-colors focus:text-[var(--accent)] md:text-4xl"
                        value={ticket.title}
                        onChange={(e) => setTicket({ ...ticket, title: e.target.value })}
                        placeholder="Enter issue summary…"
                    />
                </div>

                {/* Description */}
                <div className="mt-4 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold tracking-wide text-white/90">Description</h3>
                    <textarea
                        className="glass-input min-h-[200px] w-full resize-y rounded-2xl p-5 text-[15px] leading-relaxed text-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                        placeholder="What needs to be done? Add all details here…"
                        value={ticket.description}
                        onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                    />
                </div>

                {/* ── Activity / Comments ── */}
                <div className="mt-8 flex flex-col gap-6 border-t border-white/5 pt-8">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                            <ChatIcon className="h-4 w-4 text-violet-400" />
                        </span>
                        <h3 className="text-lg font-semibold text-white/90">Activity</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        {comments.map((c) => (
                            <div key={c._id} className="group flex gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-500/20 ring-1 ring-white/10">
                                    {(c.authorId.name || c.authorId.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                                    <div className="flex items-center gap-3 text-xs md:text-sm">
                                        <span className="font-semibold text-white">{c.authorId.name || c.authorId.email}</span>
                                        <span className="text-[10px] text-[var(--text-muted)] md:text-xs">
                                            {new Date(c.createdAt).toLocaleString(undefined, {
                                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <CommentRenderer content={c.content} />
                                </div>
                                {session?.user?.id === c.authorId._id && (
                                    <button
                                        onClick={() => handleDeleteComment(c._id)}
                                        className="h-fit rounded-lg p-1 text-[var(--text-muted)] opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                                        title="Delete comment"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {comments.length === 0 && (
                            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                                No activity yet. Be the first to comment!
                            </p>
                        )}
                    </div>

                    <div className="mt-4 flex gap-4 rounded-2xl border border-white/[0.06] bg-[var(--surface-mid)] p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[var(--surface-raised)]">
                            <UserIcon className="h-4 w-4 text-white/60" />
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                            <div className="w-full min-h-[100px] cursor-text rounded-xl border border-white/10 bg-[var(--surface-deep)] p-3 text-sm text-white transition-colors focus-within:border-violet-500 focus-within:bg-white/[0.04]">
                                <EditorContent editor={commentEditor} />
                            </div>
                            <button
                                onClick={handlePostComment}
                                disabled={commentEmpty}
                                className="glass-button-primary w-auto min-w-[140px] self-end px-5 py-2 text-sm disabled:opacity-50"
                            >
                                Post Comment
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Side Details Pane ── */}
            <div className="glass-card sticky top-6 flex h-fit w-full shrink-0 flex-col gap-8 rounded-3xl p-6 shadow-2xl md:p-8 lg:w-[360px]">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    Issue Details
                </h3>

                <div className="flex flex-col gap-6">
                    {/* Status */}
                    <DetailRow icon={<SignalIcon className="h-4 w-4" />} label="Status">
                        <CustomSelect
                            value={ticket.status}
                            options={COLUMNS.map(c => ({ value: c, label: c }))}
                            onChange={(val) => updateField("status", val)}
                            variant="status"
                        />
                    </DetailRow>

                    {/* Assignee */}
                    <DetailRow icon={<UserIcon className="h-4 w-4" />} label="Assignee">
                        <CustomSelect
                            value={typeof ticket.assigneeId === 'string' ? ticket.assigneeId : ticket.assigneeId?._id || ""}
                            options={[
                                { value: "", label: "Unassigned" },
                                ...users.map(u => ({ value: u._id, label: u.name || u.email.split("@")[0] }))
                            ]}
                            onChange={(val) => updateField("assigneeId", val)}
                        />
                    </DetailRow>

                    {/* Reporter */}
                    <DetailRow icon={<UserIcon className="h-4 w-4" />} label="Reporter">
                        <div className="glass-panel flex items-center gap-3 rounded-xl px-3 py-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                                {ticket.creatorId.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                            <span className="text-sm font-medium text-white/90">
                                {ticket.creatorId.name || ticket.creatorId.email}
                            </span>
                        </div>
                    </DetailRow>

                    <hr className="my-1 border-white/5" />

                    {/* Type */}
                    <DetailRow icon={<LayersIcon className="h-4 w-4" />} label="Issue Type">
                        <CustomSelect
                            value={ticket.type}
                            options={["Task", "Story", "Bug", "Epic"].map(t => ({ value: t, label: t }))}
                            onChange={(val) => updateField("type", val)}
                        />
                    </DetailRow>

                    {/* Priority */}
                    <DetailRow icon={<FlagIcon className="h-4 w-4" />} label="Priority">
                        <CustomSelect
                            value={ticket.priority}
                            options={["Highest", "High", "Medium", "Low", "Lowest"].map(p => ({ value: p, label: p }))}
                            onChange={(val) => updateField("priority", val)}
                            variant="priority"
                        />
                    </DetailRow>

                    {/* Deadline */}
                    <DetailRow icon={<ClockIcon className="h-4 w-4" />} label="Deadline">
                        <input
                            type="date"
                            value={ticket.estimate ? ticket.estimate.split('T')[0] : ""}
                            onChange={(e) => {
                                setTicket({ ...ticket, estimate: e.target.value });
                            }}
                            className="glass-input cursor-pointer py-2.5 text-sm [color-scheme:dark]"
                        />
                        {ticket.estimate && (
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                {new Date(ticket.estimate.split('T')[0] + 'T12:00:00').toLocaleDateString(undefined, {
                                    weekday: "short", month: "short", day: "numeric"
                                })}
                            </p>
                        )}
                    </DetailRow>

                    {/* Labels */}
                    <DetailRow icon={<TagIcon className="h-4 w-4" />} label="Labels">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                                {ticket.labels.map((l) => (
                                    <span
                                        key={l}
                                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md"
                                    >
                                        {l}
                                        <button
                                            onClick={() => {
                                                const next = ticket.labels.filter((x) => x !== l);
                                                updateField("labels", next);
                                            }}
                                            className="text-[var(--text-muted)] transition-colors hover:text-white"
                                            title="Remove"
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                {ticket.labels.length === 0 && (
                                    <span className="text-[11px] italic text-[var(--text-muted)]">None</span>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="+ Add label, press Enter…"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val && !ticket.labels.includes(val)) {
                                            updateField("labels", [...ticket.labels, val]);
                                            (e.target as HTMLInputElement).value = "";
                                        }
                                    }
                                }}
                                className="glass-input mt-1 py-2 text-xs"
                            />
                        </div>
                    </DetailRow>
                </div>
            </div>
        </div >
    );
}

/* ── Reusable detail-row wrapper ── */

function DetailRow({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {icon}
                {label}
            </label>
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

    let displayClass = "glass-panel flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all hover:bg-white/[0.05]";
    if (variant === "status" && STATUS_COLORS[value]) {
        displayClass = `${displayClass} ${STATUS_COLORS[value]} border`;
    } else if (variant === "priority" && PRIORITY_COLORS[value]) {
        const colorClass = PRIORITY_COLORS[value];
        displayClass = `${displayClass} ${colorClass.replace("text-", "bg-").replace("-400", "-500/10")} border border-white/5`;
    } else {
        displayClass = `${displayClass} text-white/90 border border-white/10`;
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={displayClass}
            >
                <span className="font-medium">
                    {variant === "priority" && (
                        <span className={`mr-2 inline-block h-2 w-2 rounded-full ${PRIORITY_COLORS[value]?.replace("text-", "bg-")}`} />
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
                    className={`h-4 w-4 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 z-[100] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--surface-overlay)] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-150">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-sm transition-colors ${opt.value === value
                                ? "bg-violet-500/20 text-white font-semibold"
                                : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                                }`}
                        >
                            {variant === "status" && (
                                <span className={`mr-2 h-2 w-2 rounded-full ${STATUS_COLORS[opt.value]?.split(" ")[0].replace("-500/15", "-400")}`} />
                            )}
                            {variant === "priority" && (
                                <span className={`mr-2 h-2 w-2 rounded-full ${PRIORITY_COLORS[opt.value]?.replace("text-", "bg-")}`} />
                            )}
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
