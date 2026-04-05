"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      const sign = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/app",
      });
      if (sign?.error) {
        router.push("/login");
        return;
      }
      window.location.href = "/app";
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass-card glass-card-elevated w-full max-w-md rounded-3xl p-9 sm:p-11">
      <div className="mb-9 flex flex-col items-center text-center">
        <div className="mb-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-mid)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-md">
          <Image
            src="/ultra-shaheens-logo.png"
            alt="Ultra Shaheens"
            width={200}
            height={120}
            className="h-auto w-44 object-contain"
            priority
          />
        </div>
        <span className="glass-pill mb-3 text-[var(--accent)] font-bold">Register</span>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Use your @ultrashaheens.com email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="reg-name"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Name
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input"
            placeholder="Your name"
          />
        </div>
        <div>
          <label
            htmlFor="reg-email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input"
            placeholder="you@ultrashaheens.com"
          />
        </div>
        <div>
          <label
            htmlFor="reg-password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
          <p className="mt-1.5 text-xs text-[var(--text-muted)] opacity-80">
            At least 8 characters
          </p>
        </div>

        {error ? (
          <p
            className="rounded-xl border border-red-400/25 bg-red-950/35 px-3 py-2.5 text-sm text-red-100 backdrop-blur-md"
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
          {pending ? "Creating account…" : "Register"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--accent)] underline-offset-4 transition-colors hover:text-[var(--accent-hover)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
