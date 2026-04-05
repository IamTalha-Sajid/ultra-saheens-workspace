"use client";

import { useEffect, useState } from "react";

type Member = {
    _id: string;
    name: string;
    email: string;
    username?: string;
    designation?: string;
    createdAt: string;
    stats: {
        assigned: number;
        completed: number;
    }
};

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

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await fetch("/api/workspace/members");
                if (res.ok) {
                    const data = await res.json();
                    setMembers(data.members);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="glass-panel mx-4 mt-3 flex shrink-0 flex-col gap-1 rounded-xl px-5 py-4 md:mx-6">
                <div className="flex items-center gap-2">
                    <span className="glass-pill text-amber-400">Workspace</span>
                </div>
                <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
                    Workspace Members
                </h1>
                <p className="text-xs text-[var(--text-muted)]">
                    All collaborators in the Ultra Shaheens workspace
                </p>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {members.map((member) => {
                        const displayName = member.name || member.email.split("@")[0];
                        const gradient = avatarGradient(displayName);

                        return (
                            <div key={member._id} className="glass-card group flex flex-col gap-5 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg font-bold text-white shadow-lg ring-1 ring-white/20`}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-white">{displayName}</h3>
                                        {member.designation && (
                                            <p className="truncate text-[10px] font-bold uppercase tracking-tight text-amber-500/80">{member.designation}</p>
                                        )}
                                        <p className="truncate text-xs text-[var(--text-muted)]">{member.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Assigned</p>
                                        <p className="mt-1 text-lg font-bold text-white">{member.stats.assigned}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Completed</p>
                                        <p className="mt-1 text-lg font-bold text-emerald-400">{member.stats.completed}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                    <span className="text-[10px] text-[var(--text-muted)]">Joined {new Date(member.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                    {member.username && (
                                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50 ring-1 ring-white/10">
                                            @{member.username}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
