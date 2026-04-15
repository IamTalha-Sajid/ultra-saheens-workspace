"use client";

import { useEffect, useMemo, useState } from "react";

type UploadItem = {
  _id: string;
  title: string;
  details: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
    username?: string;
  };
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function CommitteeUploadSection() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && file !== null && !submitting,
    [title, file, submitting]
  );

  const loadUploads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/committee-uploads");
      if (!res.ok) throw new Error("Could not load uploads");
      const data = (await res.json()) as { uploads: UploadItem[] };
      setUploads(data.uploads || []);
    } catch {
      setError("Could not load files right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUploads();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("details", details.trim());
      form.append("file", file);

      const res = await fetch("/api/committee-uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setTitle("");
      setDetails("");
      setFile(null);
      const input = document.getElementById("committee-upload-input") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/committee-uploads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not delete file");
      setUploads((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete file");
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-white/[0.08] bg-[var(--surface-mid)] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white md:text-base">Executive Board Files</h2>
          <p className="text-xs text-white/45">
            Upload PDF/DOC/Sheets/images with short details for quick access.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-12">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          className="glass-input md:col-span-4"
          maxLength={180}
          required
        />
        <input
          id="committee-upload-input"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="glass-input cursor-pointer md:col-span-4"
          required
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="glass-button-primary md:col-span-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Uploading..." : "Upload File"}
        </button>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add text details (optional)"
          className="glass-input min-h-[84px] resize-y md:col-span-12"
          maxLength={2000}
        />
      </form>

      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-white/45">Loading files...</p>
        ) : uploads.length === 0 ? (
          <p className="text-xs text-white/40">No files uploaded yet.</p>
        ) : (
          uploads.map((item) => {
            const by = item.uploadedBy?.name || item.uploadedBy?.email || "Unknown user";
            return (
              <div
                key={item._id}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="truncate text-[11px] text-white/50">
                      Uploaded by {by}
                    </p>
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[11px] text-white/45">
                      {new Date(item.createdAt).toLocaleDateString()} - {formatBytes(item.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onDelete(item._id)}
                      className="rounded-md border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="truncate text-xs text-indigo-300/90">{item.originalName}</p>
                {item.details ? <p className="mt-1 text-xs text-white/55">{item.details}</p> : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
