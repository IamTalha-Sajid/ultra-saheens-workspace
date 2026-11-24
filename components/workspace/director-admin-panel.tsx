"use client";

import { useState, type FormEvent } from "react";
import { sanitizeUsernameTyping } from "@/lib/username";

type Director = { _id: string; name: string; username?: string; designation?: string };

export function DirectorAdminPanel({
  directors,
  onCreated,
}: {
  directors: Director[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  async function createDirector(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/directors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, designation, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Could not create the team member." });
        return;
      }
      setMessage({ ok: true, text: `Created ${data.director.name}. Share the username and password with them.` });
      setName("");
      setUsername("");
      setDesignation("");
      setPassword("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(id: string) {
    const next = resetPasswords[id] ?? "";
    setMessage(null);
    const res = await fetch(`/api/admin/users/${id}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "Could not reset the password." });
      return;
    }
    setResetPasswords((s) => ({ ...s, [id]: "" }));
    setMessage({ ok: true, text: "Password updated." });
  }

  return (
    <section className="glass-card mb-6 rounded-[1.5rem] border border-white/[0.06] p-6">
      <h2 className="text-sm font-semibold text-white">Team members</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Team members sign in with a username and password. No company email needed.
      </p>

      <form onSubmit={createDirector} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Name
          <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Username
          <input
            className="glass-input"
            value={username}
            onChange={(e) => setUsername(sanitizeUsernameTyping(e.target.value))}
            required
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Designation
          <input className="glass-input" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Initial password
          <input
            className="glass-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busy} className="glass-button-primary self-end px-4 py-2 text-sm">
          {busy ? "Creating…" : "Add team member"}
        </button>
      </form>

      {message && (
        <p className={`mt-3 text-xs ${message.ok ? "text-emerald-400" : "text-red-300"}`}>{message.text}</p>
      )}

      {directors.length > 0 && (
        <ul className="mt-5 divide-y divide-white/5 border-t border-white/5">
          {directors.map((d) => (
            <li key={d._id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{d.name}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  @{d.username}
                  {d.designation ? ` · ${d.designation}` : ""}
                </p>
              </div>
              <input
                className="glass-input w-44"
                type="password"
                placeholder="New password"
                value={resetPasswords[d._id] ?? ""}
                onChange={(e) => setResetPasswords((s) => ({ ...s, [d._id]: e.target.value }))}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="glass-button px-3 py-2 text-xs"
                disabled={(resetPasswords[d._id] ?? "").length < 8}
                onClick={() => void resetPassword(d._id)}
              >
                Reset password
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
