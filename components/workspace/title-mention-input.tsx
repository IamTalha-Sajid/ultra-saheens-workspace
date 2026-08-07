"use client";

import { useRef, useState } from "react";

type MentionUser = { _id: string; name: string; email: string; username?: string };

type Props = {
    value: string;
    onChange: (v: string) => void;
    onEnter?: () => void;
    onEscape?: () => void;
    onBlur?: () => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    users: MentionUser[];
    onMention?: (user: MentionUser) => void;
};

function mentionLabel(u: MentionUser): string {
    return u.username || u.name.trim() || u.email;
}

export function TitleMentionInput({
    value,
    onChange,
    onEnter,
    onEscape,
    onBlur,
    placeholder,
    className,
    autoFocus,
    users,
    onMention,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState<string | null>(null);
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const matches = query !== null
        ? users
            .filter((u) => {
                const q = query.toLowerCase();
                return mentionLabel(u).toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
            })
            .slice(0, 6)
        : [];

    const updateMentionState = (text: string, cursor: number) => {
        const uptoCursor = text.slice(0, cursor);
        const atIndex = uptoCursor.lastIndexOf("@");
        if (atIndex === -1) { setQuery(null); setMentionStart(null); return; }
        const between = uptoCursor.slice(atIndex + 1);
        if (/\s/.test(between)) { setQuery(null); setMentionStart(null); return; }
        const before = uptoCursor[atIndex - 1];
        if (atIndex > 0 && before && !/\s/.test(before)) { setQuery(null); setMentionStart(null); return; }
        setQuery(between);
        setMentionStart(atIndex);
        setSelectedIndex(0);
    };

    const selectMention = (user: MentionUser) => {
        if (mentionStart === null) return;
        const label = mentionLabel(user);
        const cursor = inputRef.current?.selectionStart ?? value.length;
        const before = value.slice(0, mentionStart);
        const after = value.slice(cursor);
        const next = `${before}@${label} ${after}`;
        onChange(next);
        onMention?.(user);
        setQuery(null);
        setMentionStart(null);
        requestAnimationFrame(() => {
            const pos = before.length + label.length + 2;
            inputRef.current?.setSelectionRange(pos, pos);
            inputRef.current?.focus();
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (query !== null && matches.length > 0) {
            if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => (i + 1) % matches.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => (i - 1 + matches.length) % matches.length); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(matches[selectedIndex]); return; }
            if (e.key === "Escape") { e.preventDefault(); setQuery(null); setMentionStart(null); return; }
        }
        if (e.key === "Enter") onEnter?.();
        if (e.key === "Escape") onEscape?.();
    };

    return (
        <div className="relative w-full">
            <input
                ref={inputRef}
                type="text"
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    updateMentionState(e.target.value, e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyDown={handleKeyDown}
                onClick={(e) => updateMentionState(value, e.currentTarget.selectionStart ?? value.length)}
                onBlur={onBlur}
                placeholder={placeholder}
                className={className}
            />
            {query !== null && matches.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-[var(--glass-border-bright)] bg-[rgba(20,20,22,0.97)] py-1 shadow-2xl backdrop-blur-xl">
                    {matches.map((u, i) => (
                        <button
                            key={u._id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectMention(u)}
                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors ${i === selectedIndex
                                ? "bg-[var(--accent-glow)] text-white"
                                : "text-[var(--text-muted)] hover:bg-white/[0.07] hover:text-white"
                                }`}
                        >
                            <span className="font-semibold text-white">{mentionLabel(u)}</span>
                            {u.name.trim() && <span className="text-xs text-[var(--text-muted)]">{u.name}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
