"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorToolbar } from "./editor-toolbar";
import { usePages, type PageCreator } from "./pages-context";
import { createUserMentionExtension } from "./user-mention-extension";
import { EmojiPickerModal } from "./emoji-picker-modal";

function defaultDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function formatCreatedByLabel(c: PageCreator) {
  const n = c.name?.trim();
  if (n) return n;
  const e = c.email?.trim();
  if (e) {
    const at = e.indexOf("@");
    return at > 0 ? e.slice(0, at) : e;
  }
  return "Unknown";
}

function EmojiFaceIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  );
}

export function PageEditor({
  pageId,
  initialTitle,
  initialIcon,
  initialContent,
  createdBy,
}: {
  pageId: string;
  initialTitle: string;
  initialIcon: string;
  initialContent: unknown;
  createdBy: PageCreator;
}) {
  const { refresh } = usePages();
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon);
  const [isEditing, setIsEditing] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const contentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const titleRef = useRef(initialTitle);
  const iconRef = useRef(initialIcon);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    iconRef.current = icon;
  }, [icon]);

  useEffect(() => {
    setIcon(initialIcon);
    iconRef.current = initialIcon;
  }, [initialIcon]);

  const parsed =
    initialContent &&
      typeof initialContent === "object" &&
      (initialContent as { type?: string }).type === "doc"
      ? initialContent
      : defaultDoc();

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          underline: false,
          link: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),
        TextStyle,
        Color,
        FontFamily,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Subscript,
        Superscript,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Placeholder.configure({
          placeholder: "Start writing…",
          showOnlyWhenEditable: true,
        }),
        createUserMentionExtension(),
      ],
      content: parsed,
      editorProps: {
        attributes: {
          class:
            "tiptap-editor max-w-none min-h-[320px] px-4 pb-5 pt-4 text-[var(--text-primary)] focus:outline-none md:px-6",
        },
      },
    },
    [pageId]
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(isEditing);
    if (isEditing) {
      queueMicrotask(() => editor?.commands.focus("end"));
    }
  }, [editor, isEditing]);

  const persistPage = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) return;
    setSaveState("saving");
    const t = title.trim() || "Untitled";
    const ic = iconRef.current;
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, icon: ic, content: ed.getJSON() }),
    });
    await refresh();
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 2000);
  }, [pageId, title, refresh]);

  const handleSave = useCallback(() => {
    void persistPage();
  }, [persistPage]);

  const handleDone = useCallback(async () => {
    await persistPage();
    setIsEditing(false);
  }, [persistPage]);

  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if emoji picker is open
      if (emojiOpen) return;

      const target = e.target as Element;
      if (!target) return;

      // Ignore clicks on mention dropdowns (Tiptap / tippy.js)
      if (target.closest(".tippy-box") || target.closest("[data-tippy-root]")) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        setTimeout(() => {
          void handleDone();
        }, 10);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, handleDone, emojiOpen]);

  useEffect(() => {
    if (!editor || !isEditing) return;

    const flushContent = () => {
      if (contentSaveTimer.current) {
        clearTimeout(contentSaveTimer.current);
        contentSaveTimer.current = null;
      }
      const ed = editorRef.current;
      if (!ed) return;
      const t = titleRef.current.trim() || "Untitled";
      const ic = iconRef.current;
      void fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, icon: ic, content: ed.getJSON() }),
      });
    };

    const scheduleSave = () => {
      if (contentSaveTimer.current) clearTimeout(contentSaveTimer.current);
      contentSaveTimer.current = setTimeout(() => {
        const ed = editorRef.current;
        if (!ed) return;
        const t = titleRef.current.trim() || "Untitled";
        const ic = iconRef.current;
        void fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t, icon: ic, content: ed.getJSON() }),
        });
      }, 900);
    };

    editor.on("update", scheduleSave);
    return () => {
      editor.off("update", scheduleSave);
      flushContent();
    };
  }, [editor, pageId, isEditing]);

  const enterEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const patchIconOnly = useCallback(
    async (next: string) => {
      setIcon(next);
      iconRef.current = next;
      await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: next }),
      });
      await refresh();
    },
    [pageId, refresh]
  );

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-3 md:gap-5 md:px-6">
      <header className="glass-panel flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-white/[0.1] px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] md:gap-4 md:px-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2 md:gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] text-2xl leading-none shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm"
            aria-hidden={!icon}
          >
            {icon ? icon : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {isEditing ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input min-w-0 flex-1 border-0 bg-transparent py-1 text-sm font-semibold text-white placeholder:text-[var(--text-muted)] md:text-base focus:bg-transparent focus:shadow-none focus:ring-0"
                  placeholder="Untitled"
                  aria-label="Page title"
                />
                <button
                  type="button"
                  onClick={() => setEmojiOpen(true)}
                  className="glass-button-ghost shrink-0 p-2.5"
                  title="Choose page icon"
                  aria-label="Choose page icon"
                >
                  <EmojiFaceIcon className="h-5 w-5 text-[var(--gray-nickel)]" />
                </button>
              </div>
            ) : (
              <h1 className="min-w-0 truncate py-1 text-sm font-semibold text-white md:text-base">
                {title.trim() || "Untitled"}
              </h1>
            )}
            <p className="text-[11px] text-[var(--text-muted)]">
              Created by{" "}
              <span className="font-medium text-white/75">
                {formatCreatedByLabel(createdBy)}
              </span>
              {createdBy.email ? (
                <span className="text-white/35"> · {createdBy.email}</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {saveState === "saving" ? (
            <span className="text-xs font-medium text-[var(--text-muted)]">Saving…</span>
          ) : saveState === "saved" ? (
            <span className="text-xs font-medium text-emerald-400">Saved</span>
          ) : null}
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="glass-button-primary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => void handleDone()}
                disabled={saveState === "saving"}
                className="glass-button-ghost px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Done
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enterEdit}
              className="glass-button-ghost px-4 py-2"
            >
              Edit
            </button>
          )}
        </div>
      </header>

      <div className="glass-card glass-card-elevated mb-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl md:mb-8">
        {isEditing ? <EditorToolbar editor={editor} /> : null}
        <div
          className={`relative min-h-0 flex-1 overflow-y-auto ${isEditing ? "pt-2" : "pt-1"
            } ${!isEditing
              ? "cursor-pointer transition-colors hover:bg-white/[0.03]"
              : ""
            }`}
          onClick={() => {
            if (!isEditing) enterEdit();
          }}
          onKeyDown={(e) => {
            if (!isEditing && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              enterEdit();
            }
          }}
          role={!isEditing ? "button" : undefined}
          tabIndex={!isEditing ? 0 : undefined}
          aria-label={!isEditing ? "Click to edit page" : undefined}
        >
          {!isEditing ? (
            <p className="pointer-events-none absolute right-5 top-4 z-[1] select-none rounded-full border border-white/10 bg-[var(--surface-mid)] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] backdrop-blur-md md:right-7">
              Click to edit
            </p>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      </div>

      <EmojiPickerModal
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => void patchIconOnly(e)}
        onClear={() => void patchIconOnly("")}
      />
    </div>
  );
}
