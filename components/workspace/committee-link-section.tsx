"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LinkItem = {
  _id: string;
  title: string;
  url: string;
  description: string;
  department: string;
  createdAt: string;
  addedBy?: { _id: string; name: string; email: string; username?: string };
};

function LinkServiceIcon({ url }: { url: string }) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* invalid url */ }

  if (host.includes("canva.com"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7d2ae8]/15 text-[#a259ff]">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 17.5c-4.142 0-7.5-3.358-7.5-7.5S7.858 4.5 12 4.5s7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5zm-1-11.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zm4 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
        </svg>
      </span>
    );

  if (host.includes("drive.google.com") || host.includes("docs.google.com") || host.includes("sheets.google.com") || host.includes("slides.google.com") || host.includes("forms.google.com"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M7.71 3.5L1.15 15l3.43 5.96L10.14 9.46 7.71 3.5zm8.58 0l-2.43 5.96 5.56 10.5H23l-2.57-4.46L17.14 9.46 16.29 3.5zm-4.29 0L8.57 9.46 12 15l3.43-5.54L12 3.5z"/>
        </svg>
      </span>
    );

  if (host.includes("figma.com"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4zm0-10c-2.208 0-4-1.792-4-4s1.792-4 4-4h4v8H8zm0-10C5.792 4 4 2.208 4 0h8v4c0 2.208-1.792 4-4 4zm4 0V0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4zm4 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
        </svg>
      </span>
    );

  if (host.includes("youtube.com") || host.includes("youtu.be"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </span>
    );

  if (host.includes("notion.so"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white/60">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
        </svg>
      </span>
    );

  if (host.includes("sharepoint.com") || host.includes("onedrive.live.com") || host.includes("office.com"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12.5 6.5a5.5 5.5 0 0 1 5.5 5.5H20a7.5 7.5 0 0 0-7.5-7.5v2zm5.5 5.5a5.5 5.5 0 0 1-5.5 5.5V19.5a7.5 7.5 0 0 0 7.5-7.5H18zM7 12a5 5 0 0 1 5-5V5A7 7 0 0 0 5 12h2zm5 5a5 5 0 0 1-5-5H5a7 7 0 0 0 7 7v-2z"/>
        </svg>
      </span>
    );

  if (host.includes("instagram.com"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/15 text-pink-300">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
        </svg>
      </span>
    );

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    </span>
  );
}

function displayHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function CommitteeLinkSection() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", department: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/committee-links");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { links: LinkItem[] };
      setLinks(data.links ?? []);
    } catch {
      setError("Could not load links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startAdding = () => {
    setIsAdding(true);
    setForm({ title: "", url: "", department: "", description: "" });
    setFormError(null);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setFormError(null);
  };

  const submitLink = async () => {
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) { setFormError("Title is required"); return; }
    if (!url) { setFormError("URL is required"); return; }
    try { new URL(url.startsWith("http") ? url : `https://${url}`); } catch {
      setFormError("Enter a valid URL");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      const res = await fetch("/api/committee-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, url: normalizedUrl }),
      });
      const data = (await res.json()) as { error?: string; link?: LinkItem };
      if (!res.ok) { setFormError(data.error ?? "Could not save link"); return; }
      setIsAdding(false);
      void load();
    } catch {
      setFormError("Could not save link.");
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l._id !== id));
    await fetch(`/api/committee-links/${id}`, { method: "DELETE" });
  };

  const isEmpty = !loading && links.length === 0 && !isAdding;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[var(--surface-mid)]">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white md:text-base">Executive Board Links</h2>
            <p className="text-xs text-white/45">Share links to Canva designs, Google Drive, reports, and more.</p>
          </div>
          <button
            type="button"
            onClick={startAdding}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-all hover:bg-violet-500/25 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Link
          </button>
        </div>
      </div>

      {/* Add link form */}
      {isAdding && (
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-4 md:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Title *</label>
              <input
                ref={titleInputRef}
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") void submitLink(); if (e.key === "Escape") cancelAdding(); }}
                placeholder="e.g. Q3 Marketing Deck"
                className="glass-input py-1.5 text-sm"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") void submitLink(); if (e.key === "Escape") cancelAdding(); }}
                placeholder="https://..."
                className="glass-input py-1.5 text-sm"
                maxLength={2000}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") void submitLink(); if (e.key === "Escape") cancelAdding(); }}
                placeholder="e.g. Marketing, Finance…"
                className="glass-input py-1.5 text-sm"
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") void submitLink(); if (e.key === "Escape") cancelAdding(); }}
                placeholder="Optional note about this link"
                className="glass-input py-1.5 text-sm"
                maxLength={500}
              />
            </div>
          </div>

          {formError && <p className="mt-2 text-xs text-rose-300">{formError}</p>}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submitLink()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {saving && <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />}
              Save Link
            </button>
            <button
              type="button"
              onClick={cancelAdding}
              className="px-3 py-1.5 text-xs text-white/35 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Column headers */}
      {links.length > 0 && (
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-white/[0.04] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/25 md:px-5">
          <span className="w-7" />
          <span className="pl-2.5">Link</span>
          <span className="flex items-center gap-6 pr-1">
            <span className="hidden w-24 sm:block">Added by</span>
            <span className="hidden w-20 text-right sm:block">Date</span>
            <span className="w-8" />
          </span>
        </div>
      )}

      {/* Link rows */}
      {links.map((link) => {
        const by = link.addedBy?.name || link.addedBy?.email?.split("@")[0] || "—";
        return (
          <div
            key={link._id}
            className="group grid grid-cols-[auto_1fr_auto] items-center border-b border-white/[0.03] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:px-5"
          >
            <LinkServiceIcon url={link.url} />
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 pl-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-medium text-white/85 hover:text-white">{link.title}</p>
                {link.department && (
                  <span className="shrink-0 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300/80">
                    {link.department}
                  </span>
                )}
              </div>
              {link.description ? (
                <p className="mt-0.5 truncate text-[11px] text-white/35">{link.description}</p>
              ) : (
                <p className="mt-0.5 truncate text-[11px] text-white/20">{displayHost(link.url)}</p>
              )}
            </a>
            <div className="flex items-center gap-6 pr-1">
              <span className="hidden w-24 truncate text-xs text-white/40 sm:block">{by}</span>
              <span className="hidden w-20 text-right text-xs text-white/40 sm:block">
                {new Date(link.createdAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={() => void deleteLink(link._id)}
                title="Remove link"
                className="w-8 rounded-md p-1.5 text-white/0 transition-all group-hover:text-white/30 hover:!text-rose-300 hover:bg-rose-500/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2.5 px-4 py-8 text-xs text-white/35 md:px-5">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white/20 border-t-white/55" />
          Loading…
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white/15">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white/35">No links yet</p>
            <p className="text-xs text-white/20">Click &ldquo;Add Link&rdquo; to share a resource</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p className="px-4 pb-3 text-xs text-rose-300 md:px-5">{error}</p>}
    </section>
  );
}
