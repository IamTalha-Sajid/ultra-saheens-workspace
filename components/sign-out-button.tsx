"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)] transition-all hover:border-danger/30 hover:bg-danger/10 hover:text-danger active:scale-[0.98]"
    >
      Sign out
    </button>
  );
}
