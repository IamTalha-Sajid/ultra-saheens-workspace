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
  progress: number;
  error?: string;
};

type Crumb = { id: string | null; name: string };

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; data: { error?: string } | null }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { error?: string } | null = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
    };
    xhr.onerror = () => resolve({ ok: false, data: null });
    xhr.send(form);
  });
}

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
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderNameInputRef = useRef<HTMLInputElement>(null);
  const renameFolderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const load = useCallback(async (id: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const folderQ = id ? `?type=file&parentId=${id}` : "?type=file";
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
    setCrumbs((prev) => {
      if (prev[prev.length - 1]?.id === folder._id) return prev;
      return [...prev, { id: folder._id, name: folder.name }];
    });
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
      body: JSON.stringify({ name, type: "file", parentId: currentFolderId }),
    });
    if (res.ok) void load(currentFolderId);
    else setError("Could not create folder.");
  };

  const uploadFiles = useCallback(async (fileList: File[], folderId: string | null) => {
    const items: UploadingItem[] = fileList.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      status: "uploading" as const,
      progress: 0,
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
          const { ok, data } = await uploadWithProgress("/api/committee-uploads", form, (pct) => {
            setUploading((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: pct } : it)));
          });
          if (!ok) throw new Error(data?.error || "Upload failed");
          setUploading((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, status: "done", progress: 100 } : it))
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

  const uploadFolder = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;

    const rootName = fileList[0].webkitRelativePath.split("/")[0];

    const rootRes = await fetch("/api/committee-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: rootName, type: "file", parentId: currentFolderId }),
    });
    const rootData = await parseJsonSafe<{ folder: FolderItem }>(rootRes);
    if (!rootRes.ok || !rootData) { setError("Could not create folder."); return; }
    const rootFolder = rootData.folder;

    const folderIdByPath = new Map<string, string>();
    folderIdByPath.set(rootName, rootFolder._id);
    const creating = new Map<string, Promise<string>>();

    const ensureFolder = (parts: string[]): Promise<string> => {
      const key = parts.join("/");
      if (folderIdByPath.has(key)) return Promise.resolve(folderIdByPath.get(key)!);
      if (creating.has(key)) return creating.get(key)!;
      const p = (async () => {
        const parentId = await ensureFolder(parts.slice(0, -1));
        const res = await fetch("/api/committee-folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: parts[parts.length - 1], type: "file", parentId }),
        });
        const data = await parseJsonSafe<{ folder: FolderItem }>(res);
        if (!res.ok || !data) throw new Error("Could not create folder.");
        folderIdByPath.set(key, data.folder._id);
        return data.folder._id;
      })();
      creating.set(key, p);
      return p;
    };

    const items: UploadingItem[] = fileList.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.webkitRelativePath || f.name,
      status: "uploading" as const,
      progress: 0,
    }));
    setUploading((prev) => [...prev, ...items]);

    await Promise.all(
      fileList.map(async (file, i) => {
        const itemId = items[i].id;
        try {
          const parts = file.webkitRelativePath.split("/");
          const folderId = await ensureFolder(parts.slice(0, -1));
          const form = new FormData();
          form.append("title", file.name);
          form.append("file", file);
          form.append("folderId", folderId);
          const { ok, data } = await uploadWithProgress("/api/committee-uploads", form, (pct) => {
            setUploading((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: pct } : it)));
          });
          if (!ok) throw new Error(data?.error ?? "Upload failed");
          setUploading((prev) => prev.map((it) => it.id === itemId ? { ...it, status: "done", progress: 100 } : it));
        } catch (err) {
          setUploading((prev) => prev.map((it) => it.id === itemId
            ? { ...it, status: "error", error: err instanceof Error ? err.message : "Failed" }
            : it
          ));
        }
      })
    );

    void load(currentFolderId);
    setTimeout(() => setUploading((prev) => prev.filter((it) => it.status !== "done")), 2500);
  }, [currentFolderId, load]);

  const uploadFolderViaPicker = useCallback(async () => {
    const pickDirectory = (window as unknown as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;
    if (!pickDirectory) {
      folderInputRef.current?.click();
      return;
    }

    let rootHandle: FileSystemDirectoryHandle;
    try {
      rootHandle = await pickDirectory();
    } catch {
      return; // user cancelled
    }

    const filesToUpload: { file: File; folderId: string | null }[] = [];

    const walkHandle = async (dirHandle: FileSystemDirectoryHandle, parentId: string | null): Promise<void> => {
      const res = await fetch("/api/committee-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dirHandle.name, type: "file", parentId }),
      });
      const data = await parseJsonSafe<{ folder: FolderItem }>(res);
      if (!res.ok || !data) { setError("Could not create folder."); return; }
      const { folder } = data;

      for await (const handle of (dirHandle as unknown as {
        values: () => AsyncIterable<FileSystemDirectoryHandle | (FileSystemHandle & { getFile: () => Promise<File> })>;
      }).values()) {
        if (handle.kind === "directory") {
          await walkHandle(handle as FileSystemDirectoryHandle, folder._id);
        } else {
          const file = await (handle as unknown as { getFile: () => Promise<File> }).getFile();
          filesToUpload.push({ file, folderId: folder._id });
        }
      }
    };

    await walkHandle(rootHandle, currentFolderId);
    void load(currentFolderId);

    if (filesToUpload.length) {
      const uploadItems: UploadingItem[] = filesToUpload.map(({ file }) => ({
        id: Math.random().toString(36).slice(2),
        name: file.name,
        status: "uploading" as const,
        progress: 0,
      }));
      setUploading((prev) => [...prev, ...uploadItems]);

      await Promise.all(
        filesToUpload.map(async ({ file, folderId }, i) => {
          const itemId = uploadItems[i].id;
          try {
            const form = new FormData();
            form.append("title", file.name);
            form.append("file", file);
            if (folderId) form.append("folderId", folderId);
            const { ok, data } = await uploadWithProgress("/api/committee-uploads", form, (pct) => {
              setUploading((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: pct } : it)));
            });
            if (!ok) throw new Error(data?.error || "Upload failed");
            setUploading((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "done", progress: 100 } : it)));
          } catch (err) {
            setUploading((prev) => prev.map((it) => it.id === itemId
              ? { ...it, status: "error", error: err instanceof Error ? err.message : "Failed" }
              : it
            ));
          }
        })
      );

      void load(currentFolderId);
      setTimeout(() => setUploading((prev) => prev.filter((it) => it.status !== "done")), 2500);
    }
  }, [currentFolderId, load]);

  const readAllDirEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      const all: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((entries) => {
          if (entries.length === 0) { resolve(all); return; }
          all.push(...entries);
          readBatch();
        }, reject);
      };
      readBatch();
    });

  const uploadDroppedTree = useCallback(async (items: DataTransferItem[], parentId: string | null) => {
    const filesToUpload: { file: File; folderId: string | null }[] = [];

    const walk = async (entry: FileSystemEntry, targetFolderId: string | null): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => {
          (entry as FileSystemFileEntry).file(resolve);
        });
        filesToUpload.push({ file, folderId: targetFolderId });
        return;
      }

      const res = await fetch("/api/committee-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entry.name, type: "file", parentId: targetFolderId }),
      });
      const data = await parseJsonSafe<{ folder: FolderItem }>(res);
      if (!res.ok || !data) { setError("Could not create folder."); return; }
      const { folder } = data;

      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await readAllDirEntries(reader);
      for (const child of children) await walk(child, folder._id);
    };

    const entries = items.map((item) => item.webkitGetAsEntry()).filter((e): e is FileSystemEntry => !!e);
    await Promise.all(entries.map((entry) => walk(entry, parentId)));

    void load(currentFolderId);

    if (filesToUpload.length) {
      const uploadItems: UploadingItem[] = filesToUpload.map(({ file }) => ({
        id: Math.random().toString(36).slice(2),
        name: file.name,
        status: "uploading" as const,
        progress: 0,
      }));
      setUploading((prev) => [...prev, ...uploadItems]);

      await Promise.all(
        filesToUpload.map(async ({ file, folderId }, i) => {
          const itemId = uploadItems[i].id;
          try {
            const form = new FormData();
            form.append("title", file.name);
            form.append("file", file);
            if (folderId) form.append("folderId", folderId);
            const { ok, data } = await uploadWithProgress("/api/committee-uploads", form, (pct) => {
              setUploading((prev) => prev.map((it) => (it.id === itemId ? { ...it, progress: pct } : it)));
            });
            if (!ok) throw new Error(data?.error || "Upload failed");
            setUploading((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "done", progress: 100 } : it)));
          } catch (err) {
            setUploading((prev) => prev.map((it) =>
              it.id === itemId
                ? { ...it, status: "error", error: err instanceof Error ? err.message : "Failed" }
                : it
            ));
          }
        })
      );

      void load(currentFolderId);
      setTimeout(() => setUploading((prev) => prev.filter((it) => it.status !== "done")), 2500);
    }
  }, [currentFolderId, load]);

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

    const items = Array.from(e.dataTransfer.items);
    const hasFolder = items.some((item) => item.webkitGetAsEntry()?.isDirectory);

    if (hasFolder) {
      void uploadDroppedTree(items, currentFolderId);
    } else {
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length) void uploadFiles(dropped, currentFolderId);
    }
  };

  const deleteFile = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f._id !== id));
    await fetch(`/api/committee-uploads/${id}`, { method: "DELETE" });
  };

  const deleteFolder = async (id: string) => {
    setFolders((prev) => prev.filter((f) => f._id !== id));
    await fetch(`/api/committee-folders/${id}`, { method: "DELETE" });
  };

  const startRenameFolder = (folder: FolderItem) => {
    setRenamingFolderId(folder._id);
    setRenameFolderName(folder.name);
    setTimeout(() => renameFolderInputRef.current?.focus(), 0);
  };

  const confirmRenameFolder = async () => {
    const id = renamingFolderId;
    const name = renameFolderName.trim();
    setRenamingFolderId(null);
    if (!id || !name) return;
    const prevFolders = folders;
    setFolders((prev) => prev.map((f) => (f._id === id ? { ...f, name } : f)));
    const res = await fetch(`/api/committee-folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setFolders(prevFolders);
      setError("Could not rename folder.");
    }
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
            onClick={() => void uploadFolderViaPicker()}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-all hover:bg-amber-500/20 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
              <path d="M12 10v6"/><path d="M9 13h6"/>
            </svg>
            Upload Folder
          </button>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length) void uploadFolder(picked);
              e.target.value = "";
            }}
          />

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
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
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
              <span className="hidden w-28 sm:block">Created by</span>
              <span className="hidden w-20 text-right sm:block">Date</span>
              <span className="w-14 text-right">Size</span>
              <span className="w-16 text-right">Actions</span>
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
            {renamingFolderId === folder._id ? (
              <input
                ref={renameFolderInputRef}
                type="text"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                onBlur={() => void confirmRenameFolder()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmRenameFolder();
                  if (e.key === "Escape") setRenamingFolderId(null);
                }}
                maxLength={180}
                className="glass-input min-w-0 py-1 pl-2.5 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                onClick={() => navigateTo(folder)}
                onDoubleClick={(e) => { e.stopPropagation(); startRenameFolder(folder); }}
                className="min-w-0 pl-2.5 text-left"
              >
                <span className="block truncate text-sm font-medium text-white/85 hover:text-white">{folder.name}</span>
              </button>
            )}
            <div className="flex cursor-default items-center gap-8 pr-1">
              <span className="hidden w-28 text-xs text-white/30 sm:block">—</span>
              <span className="hidden w-20 text-right text-xs text-white/30 sm:block">
                {new Date(folder.createdAt).toLocaleDateString()}
              </span>
              <span className="w-14 text-right text-xs text-white/30">—</span>
              <div className="flex w-16 items-center justify-end">
                <button
                  type="button"
                  onClick={() => startRenameFolder(folder)}
                  title="Rename folder"
                  className="rounded-md p-1.5 text-white/0 transition-all group-hover:text-white/30 hover:!text-violet-300 hover:bg-violet-500/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
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
              <div className="flex cursor-default items-center gap-8 pr-1">
                <span className="hidden w-28 truncate text-xs text-white/40 sm:block">{by}</span>
                <span className="hidden w-20 text-right text-xs text-white/40 sm:block">
                  {new Date(file.createdAt).toLocaleDateString()}
                </span>
                <span className="w-14 text-right text-xs text-white/30">{formatBytes(file.size)}</span>
                <div className="flex w-10 items-center justify-end">
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
              <div key={item.id} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-2.5">
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
                  {item.status === "uploading" && (
                    <span className="shrink-0 tabular-nums text-white/35">{item.progress}%</span>
                  )}
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
                {item.status === "uploading" && (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-violet-400 transition-[width] duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
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
