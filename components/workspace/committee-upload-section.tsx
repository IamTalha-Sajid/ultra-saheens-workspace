"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FolderItem = {
  _id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
};

type FileItem = {
  _id: string;
  folderId?: string | null;
  title: string;
  details: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploadedBy?: { _id: string; name: string; email: string; username?: string };
};

type UploadingItem = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
};

type Crumb = { id: string | null; name: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </span>
    );
  if (mime.includes("pdf"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
      </span>
    );
  if (mime.includes("word") || mime.includes("document"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
      </span>
    );
  if (mime.includes("excel") || mime.includes("sheet"))
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
      </span>
    );
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/40">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
    </span>
  );
}

export function CommitteeUploadSection() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "Files" }]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderNameInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const load = useCallback(async (id: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const folderQ = id ? `?parentId=${id}` : "";
      const fileQ = id ? `?folderId=${id}` : "";
      const [fRes, uRes] = await Promise.all([
        fetch(`/api/committee-folders${folderQ}`),
        fetch(`/api/committee-uploads${fileQ}`),
      ]);
      if (!fRes.ok || !uRes.ok) throw new Error();
      const [fd, ud] = await Promise.all([fRes.json(), uRes.json()]);
      setFolders((fd as { folders: FolderItem[] }).folders ?? []);
      setFiles((ud as { uploads: FileItem[] }).uploads ?? []);
    } catch {
      setError("Could not load files.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(currentFolderId); }, [load, currentFolderId]);

  const navigateTo = (folder: FolderItem) => {
    setCrumbs((prev) => [...prev, { id: folder._id, name: folder.name }]);
    setCurrentFolderId(folder._id);
  };

  const navigateCrumb = (i: number) => {
    const c = crumbs[i];
    setCrumbs((prev) => prev.slice(0, i + 1));
    setCurrentFolderId(c.id);
  };

  const startCreateFolder = () => {
    setIsCreatingFolder(true);
    setNewFolderName("");
    setTimeout(() => folderNameInputRef.current?.focus(), 0);
  };

  const confirmCreateFolder = async () => {
    const name = newFolderName.trim();
    setIsCreatingFolder(false);
    setNewFolderName("");
    if (!name) return;
    const res = await fetch("/api/committee-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: currentFolderId }),
    });
    if (res.ok) void load(currentFolderId);
    else setError("Could not create folder.");
  };

  const uploadFiles = useCallback(async (fileList: File[], folderId: string | null) => {
    const items: UploadingItem[] = fileList.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      status: "uploading" as const,
    }));
    setUploading((prev) => [...prev, ...items]);

    await Promise.all(
      fileList.map(async (file, i) => {
        const itemId = items[i].id;
        try {
          const form = new FormData();
          form.append("title", file.name);
          form.append("file", file);
          if (folderId) form.append("folderId", folderId);
          const res = await fetch("/api/committee-uploads", { method: "POST", body: form });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) throw new Error(data?.error || "Upload failed");
          setUploading((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, status: "done" } : it))
          );
        } catch (err) {
          setUploading((prev) =>
            prev.map((it) =>
              it.id === itemId
                ? { ...it, status: "error", error: err instanceof Error ? err.message : "Failed" }
                : it
            )
          );
        }
      })
    );

    void load(folderId);
    setTimeout(
      () => setUploading((prev) => prev.filter((it) => it.status !== "done")),
      2500
    );
  }, [load]);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (++dragCounter.current === 1) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (--dragCounter.current === 0) setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) void uploadFiles(dropped, currentFolderId);
  };

  const deleteFile = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f._id !== id));
    await fetch(`/api/committee-uploads/${id}`, { method: "DELETE" });
  };

  const deleteFolder = async (id: string) => {
    setFolders((prev) => prev.filter((f) => f._id !== id));
    await fetch(`/api/committee-folders/${id}`, { method: "DELETE" });
  };

  const hasContent = folders.length > 0 || files.length > 0 || isCreatingFolder;
  const isEmpty = !loading && !hasContent;

  return (
    <section
      className="relative mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[var(--surface-mid)]"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="border-b border-white/[0.07] px-4 py-4 md:px-5">
        <h2 className="text-sm font-semibold text-white md:text-base">Executive Board Files</h2>
        <p className="text-xs text-white/45">Upload and organize files. Drag files anywhere to upload.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-2.5 md:px-5">
        {/* Breadcrumb */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs">
          {crumbs.map((c, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="text-white/20">/</span>}
              <button
                type="button"
                onClick={() => navigateCrumb(i)}
                className={`flex items-center gap-1 truncate transition-colors ${
                  i === crumbs.length - 1
                    ? "pointer-events-none font-medium text-white/80"
                    : "text-white/45 hover:text-white"
                }`}
              >
                {i === 0 && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                  </svg>
                )}
                {c.name}
              </button>
            </span>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startCreateFolder}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/65 transition-all hover:bg-white/[0.07] hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
              <line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/>
            </svg>
            New Folder
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-all hover:bg-violet-500/25 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length) void uploadFiles(picked, currentFolderId);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-[100px]">
        {/* Column headers */}
        {hasContent && (
          <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-white/[0.04] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/25 md:px-5">
            <span className="w-7" />
            <span className="pl-2.5">Name</span>
            <span className="flex items-center gap-8 pr-1">
              <span className="hidden w-28 sm:block">Uploaded by</span>
              <span className="hidden w-20 text-right sm:block">Date</span>
              <span className="w-24 text-right">Size</span>
            </span>
          </div>
        )}

        {/* New folder inline row */}
        {isCreatingFolder && (
          <div className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 md:px-5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0 text-amber-400/70">
              <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15zM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 12h-15a4.483 4.483 0 0 0-3 1.146V10.146z"/>
            </svg>
            <input
              ref={folderNameInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmCreateFolder();
                if (e.key === "Escape") { setIsCreatingFolder(false); setNewFolderName(""); }
              }}
              placeholder="Folder name"
              className="glass-input flex-1 py-1 text-sm"
              maxLength={180}
            />
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => void confirmCreateFolder()} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500">
                Create
              </button>
              <button type="button" onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }} className="px-2 py-1.5 text-xs text-white/35 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Folder rows */}
        {folders.map((folder) => (
          <div
            key={folder._id}
            className="group grid grid-cols-[auto_1fr_auto] items-center border-b border-white/[0.03] px-4 py-2 transition-colors hover:bg-white/[0.03] md:px-5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0 text-amber-400/75">
              <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15zM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 12h-15a4.483 4.483 0 0 0-3 1.146V10.146z"/>
            </svg>
            <button
              type="button"
              onClick={() => navigateTo(folder)}
              className="min-w-0 pl-2.5 text-left"
            >
              <span className="block truncate text-sm font-medium text-white/85 hover:text-white">{folder.name}</span>
            </button>
            <div className="flex items-center gap-8 pr-1">
              <span className="hidden w-28 text-xs text-white/30 sm:block">—</span>
              <span className="hidden w-20 text-right text-xs text-white/30 sm:block">
                {new Date(folder.createdAt).toLocaleDateString()}
              </span>
              <div className="flex w-24 items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => void deleteFolder(folder._id)}
                  title="Delete folder and contents"
                  className="rounded-md p-1.5 text-white/0 transition-all group-hover:text-white/30 hover:!text-rose-300 hover:bg-rose-500/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* File rows */}
        {files.map((file) => {
          const by = file.uploadedBy?.name || file.uploadedBy?.email?.split("@")[0] || "—";
          return (
            <div
              key={file._id}
              className="group grid grid-cols-[auto_1fr_auto] items-center border-b border-white/[0.03] px-4 py-2 transition-colors last:border-b-0 hover:bg-white/[0.03] md:px-5"
            >
              <FileTypeIcon mime={file.mimeType} />
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 pl-2.5"
              >
                <p className="truncate text-sm font-medium text-white/85 hover:text-white">{file.title}</p>
                {file.details && (
                  <p className="truncate text-[11px] text-white/35">{file.details}</p>
                )}
              </a>
              <div className="flex items-center gap-8 pr-1">
                <span className="hidden w-28 truncate text-xs text-white/40 sm:block">{by}</span>
                <span className="hidden w-20 text-right text-xs text-white/40 sm:block">
                  {new Date(file.createdAt).toLocaleDateString()}
                </span>
                <div className="flex w-24 items-center justify-end gap-2">
                  <span className="text-xs text-white/30">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => void deleteFile(file._id)}
                    title="Delete file"
                    className="rounded-md p-1.5 text-white/0 transition-all group-hover:text-white/30 hover:!text-rose-300 hover:bg-rose-500/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
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
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white/35">No files here yet</p>
              <p className="text-xs text-white/20">Drag files here or click Upload</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="px-4 pb-3 text-xs text-rose-300 md:px-5">{error}</p>}

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="border-t border-white/[0.06] bg-black/10 px-4 py-3 md:px-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Uploading</p>
          <div className="space-y-2">
            {uploading.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 text-xs">
                {item.status === "uploading" && (
                  <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-violet-400/30 border-t-violet-300" />
                )}
                {item.status === "done" && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-emerald-400">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
                {item.status === "error" && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-rose-400">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                )}
                <span className={`min-w-0 flex-1 truncate ${
                  item.status === "error" ? "text-rose-300" :
                  item.status === "done" ? "text-emerald-300/70" : "text-white/55"
                }`}>
                  {item.name}
                  {item.status === "error" && item.error && (
                    <span className="text-rose-400/70"> — {item.error}</span>
                  )}
                </span>
                {item.status !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => setUploading((prev) => prev.filter((i) => i.id !== item.id))}
                    className="shrink-0 text-white/20 hover:text-white/60"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-violet-400/50 bg-violet-500/10 backdrop-blur-[2px]">
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/20 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-violet-300">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-violet-200">Drop files to upload</p>
          {crumbs.length > 1 && (
            <p className="text-xs text-violet-300/60">into {crumbs[crumbs.length - 1].name}</p>
          )}
        </div>
      )}
    </section>
  );
}
