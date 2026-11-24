"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError("Invalid email/username or password.");
        return;
      }
      window.location.href = callbackUrl;
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass-card glass-card-elevated w-full max-w-md p-8 sm:p-10">
      <div className="mb-9 flex flex-col items-center text-center">
        <Image
          src="/ultra-shaheens-logo.png"
          alt="Ultra Shaheens"
          width={200}
          height={120}
          className="mb-6 h-auto w-36 object-contain"
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Sign in with your @ultrashaheens.com account, or your username
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Email or username
          </label>
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input"
            placeholder="you@ultrashaheens.com or username"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error ? (
          <p
            className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="glass-button-primary mt-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-[var(--text-muted)]">
        No account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--accent)] underline-offset-4 transition-colors hover:text-[var(--accent-hover)] hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
