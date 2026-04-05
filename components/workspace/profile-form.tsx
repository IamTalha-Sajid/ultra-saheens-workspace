"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  normalizeUsernameInput,
  sanitizeUsernameTyping,
} from "@/lib/username";

type ProfilePayload = {
  email: string;
  name: string;
  username: string;
  designation: string;
};

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

export function ProfileForm({ initial }: { initial: ProfilePayload }) {
  const router = useRouter();
  const { update } = useSession();
  const [baseline, setBaseline] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [designation, setDesignation] = useState(initial.designation);
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);

  const syncFromServer = useCallback(async (): Promise<ProfilePayload | null> => {
    const res = await fetch("/api/user/profile");
    if (!res.ok) return null;
    const data = (await res.json()) as ProfilePayload;
    setName(data.name);
    setUsername(data.username);
    setDesignation(data.designation);
    setEmail(data.email);
    setBaseline(data);
    return data;
  }, []);

  useEffect(() => {
    if (editingAccount) return;
    void syncFromServer();
  }, [syncFromServer, editingAccount]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    const emailChanged =
      email.trim().toLowerCase() !== baseline.email.toLowerCase();
    if (emailChanged && !currentPassword) {
      setProfileError(
        "Enter your current password to change your email address."
      );
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: normalizeUsernameInput(username),
          designation: designation.trim(),
          ...(emailChanged
            ? { email: email.trim().toLowerCase(), currentPassword }
            : {}),
        }),
      });
      const data = (await res.json()) as { error?: string; user?: ProfilePayload };
      if (!res.ok) {
        setProfileError(data.error ?? "Could not save profile.");
        return;
      }
      if (data.user) {
        setName(data.user.name);
        setUsername(data.user.username);
        setEmail(data.user.email);
        setBaseline(data.user);
        try {
          await update({
            name: data.user.name,
            email: data.user.email,
            username: data.user.username,
            designation: data.user.designation,
          });
        } catch {
          /* DB is source of truth; session refresh is best-effort */
        }
        router.refresh();
      }
      setProfileMessage("Profile saved.");
      setEditingAccount(false);
      if (emailChanged) setCurrentPassword("");
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelAccountEdit = () => {
    setName(baseline.name);
    setUsername(baseline.username);
    setDesignation(baseline.designation);
    setEmail(baseline.email);
    setProfileError(null);
    setProfileMessage(null);
    setEditingAccount(false);
  };

  const saveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecurityMessage(null);
    if (!newPassword) {
      setSecurityError("Enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("New password and confirmation do not match.");
      return;
    }
    if (!currentPassword) {
      setSecurityError("Enter your current password.");
      return;
    }
    setSavingSecurity(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSecurityError(data.error ?? "Could not update password.");
        return;
      }
      setSecurityMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingSecurity(false);
    }
  };

  const emailChanged =
    email.trim().toLowerCase() !== baseline.email.toLowerCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 p-5 md:p-10">
      <header className="glass-panel rounded-3xl px-6 py-5 md:px-8">
        <Link
          href="/app"
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          ← Back to workspace
        </Link>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
            Profile
          </h1>
          <span className="glass-pill text-[var(--accent)]">Account</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Your display name and username are used across the workspace; your
          username powers @mentions and notifications.
        </p>
      </header>

      <div className="glass-card glass-card-elevated max-w-xl rounded-3xl p-7 md:p-9">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Account
          </h2>
          {!editingAccount ? (
            <button
              type="button"
              onClick={() => {
                setProfileError(null);
                setProfileMessage(null);
                void (async () => {
                  await syncFromServer();
                  setEditingAccount(true);
                })();
              }}
              className="shrink-0 rounded-xl border border-[var(--glass-border)] bg-transparent p-2 text-[var(--text-muted)] backdrop-blur-sm transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent-glow)] hover:text-white"
              aria-label="Edit display name, username, and email"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {!editingAccount ? (
          <dl className="mt-6 space-y-5">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Display name
              </dt>
              <dd className="mt-1 text-base font-semibold text-white">
                {name.trim() ? name.trim() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Username
              </dt>
              <dd className="mt-1 font-mono text-base text-white">
                {username.trim() ? (
                  <span className="text-[var(--accent)]">@{username.trim()}</span>
                ) : (
                  <span className="text-[var(--text-muted)]">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Designation
              </dt>
              <dd className="mt-1 text-base font-semibold text-white">
                {designation.trim() ? designation.trim() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Email
              </dt>
              <dd className="mt-1 break-all text-sm font-medium text-[var(--text-muted)]">
                {email}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={saveProfile} className="mt-6">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-muted)]">Display name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input mt-1.5"
                maxLength={120}
                autoComplete="name"
                aria-label="Display name"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-[var(--text-muted)]">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(sanitizeUsernameTyping(e.target.value))
                }
                className="glass-input mt-1.5 font-mono text-sm"
                maxLength={USERNAME_MAX}
                autoComplete="username"
                spellCheck={false}
                aria-label="Username"
              />
              <span className="mt-1 block text-xs text-[var(--text-muted)] opacity-80">
                {USERNAME_MIN}–{USERNAME_MAX} characters: lowercase letters, numbers,
                and underscores only. Leave empty to clear. Used for @mentions.
              </span>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-[var(--text-muted)]">Designation</span>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="glass-input mt-1.5"
                maxLength={120}
                placeholder="e.g. Lead Developer, Product Manager"
                aria-label="Designation"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-[var(--text-muted)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input mt-1.5"
                autoComplete="email"
                aria-label="Email"
              />
              <span className="mt-1 block text-xs text-[var(--text-muted)] opacity-80">
                Must stay an @ultrashaheens.com address. Changing email requires your
                current password.
              </span>
            </label>
            {emailChanged ? (
              <label className="mt-4 block">
                <span className="text-sm font-medium text-[var(--text-muted)]">
                  Current password (required to change email)
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="glass-input mt-1.5"
                  autoComplete="current-password"
                  aria-label="Current password for email change"
                />
              </label>
            ) : null}
            {profileError ? (
              <p className="mt-3 text-sm font-medium text-red-500">{profileError}</p>
            ) : null}
            {profileMessage ? (
              <p className="mt-3 text-sm font-medium text-[var(--accent)]">{profileMessage}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="glass-button-primary max-w-[12rem] w-full"
              >
                {savingProfile ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={cancelAccountEdit}
                className="glass-button-ghost px-4 py-2.5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!editingAccount && profileMessage ? (
          <p className="mt-4 text-sm font-medium text-[var(--accent)]">{profileMessage}</p>
        ) : null}
        {!editingAccount && profileError ? (
          <p className="mt-4 text-sm font-medium text-red-500">{profileError}</p>
        ) : null}
      </div>

      <form
        onSubmit={saveSecurity}
        className="glass-card glass-card-elevated max-w-xl rounded-[1.5rem] p-7 md:p-9"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Password
        </h2>
        <label className="mt-5 block">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            Current password
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="glass-input mt-1.5"
            autoComplete="current-password"
            aria-label="Current password"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-[var(--text-muted)]">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="glass-input mt-1.5"
            autoComplete="new-password"
            aria-label="New password"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            Confirm new password
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="glass-input mt-1.5"
            autoComplete="new-password"
            aria-label="Confirm new password"
          />
        </label>
        {securityError ? (
          <p className="mt-3 text-sm font-medium text-red-500">{securityError}</p>
        ) : null}
        {securityMessage ? (
          <p className="mt-3 text-sm font-medium text-[var(--accent)]">
            {securityMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={savingSecurity}
          className="glass-button-primary mt-6 max-w-[12rem] w-full"
        >
          {savingSecurity ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
