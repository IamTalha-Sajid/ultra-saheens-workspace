"use client";

import type { Editor } from "@tiptap/core";
import { useFeedback } from "@/components/ui/feedback-provider";

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"] as const;

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void | boolean | Promise<void | boolean>;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border border-transparent px-2.5 py-1.5 text-sm transition-all disabled:opacity-40 ${active
        ? "border-[var(--accent)]/50 bg-[var(--accent-glow)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
        : "text-[var(--text-muted)] hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const { promptText } = useFeedback();

  if (!editor) {
    return (
      <div className="glass-toolbar flex min-h-[48px] flex-wrap gap-1 px-3 py-2.5" />
    );
  }

  const rawSize = editor.getAttributes("textStyle").fontSize as string | undefined;
  const curSize = rawSize?.replace("px", "").trim() ?? "";

  return (
    <div className="glass-toolbar flex flex-wrap items-center gap-1 px-3 py-2.5">
      <div className="mr-2 flex flex-wrap gap-0.5 border-r border-white/[0.1] pr-2">
        <ToolbarButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↷
        </ToolbarButton>
      </div>

      <div className="mr-2 flex flex-wrap gap-0.5 border-r border-white/[0.1] pr-2">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </ToolbarButton>
        <ToolbarButton
          title="Code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {"</>"}
        </ToolbarButton>
      </div>

      <div className="mr-2 flex flex-wrap items-center gap-1 border-r border-white/[0.1] pr-2">
        <span className="text-[10px] uppercase text-[var(--xanadu)]">H</span>
        {([1, 2, 3] as const).map((level) => (
          <ToolbarButton
            key={level}
            title={`Heading ${level}`}
            active={editor.isActive("heading", { level })}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </ToolbarButton>
        ))}
      </div>

      <div className="mr-2 flex flex-wrap gap-0.5 border-r border-white/[0.1] pr-2">
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          “ ”
        </ToolbarButton>
        <ToolbarButton
          title="Task List"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          ☐ Task
        </ToolbarButton>
        <ToolbarButton
          title="Code Block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"< > Code"}
        </ToolbarButton>
      </div>

      <div className="mr-2 flex flex-wrap items-center gap-1 border-r border-white/[0.1] pr-2">
        <label className="sr-only" htmlFor="font-size">
          Font size
        </label>
        <select
          id="font-size"
          value={curSize ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              editor.chain().focus().unsetFontSize().run();
              return;
            }
            editor.chain().focus().setFontSize(`${v}px`).run();
          }}
          className="rounded-lg border border-white/12 bg-black/30 px-2 py-1.5 text-sm text-white backdrop-blur-md"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
      </div>

      <div className="mr-2 flex flex-wrap items-center gap-1 border-r border-white/[0.1] pr-2">
        <span className="text-[10px] uppercase text-[var(--xanadu)]">A</span>
        <input
          type="color"
          title="Text color"
          className="h-8 w-8 cursor-pointer rounded-lg border border-white/12 bg-white/5 p-0 backdrop-blur-sm"
          value={editor.getAttributes("textStyle").color || "#f4f4f3"}
          onChange={(e) =>
            editor.chain().focus().setColor(e.target.value).run()
          }
        />
        <input
          type="color"
          title="Highlight"
          className="h-8 w-8 cursor-pointer rounded-lg border border-white/12 bg-white/5 p-0 backdrop-blur-sm"
          value="#8b5cf6"
          onChange={(e) =>
            editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
          }
        />
        <ToolbarButton
          title="Remove highlight"
          onClick={() => editor.chain().focus().unsetHighlight().run()}
        >
          HL×
        </ToolbarButton>
      </div>

      <div className="mr-2 flex flex-wrap gap-0.5 border-r border-white/[0.1] pr-2">
        {(
          [
            ["left", "L"],
            ["center", "C"],
            ["right", "R"],
            ["justify", "J"],
          ] as const
        ).map(([align, label]) => (
          <ToolbarButton
            key={align}
            title={`Align ${align}`}
            active={editor.isActive({ textAlign: align })}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
          >
            {label}
          </ToolbarButton>
        ))}
      </div>

      <div className="mr-2 flex flex-wrap gap-0.5 border-r border-white/[0.1] pr-2">
        <ToolbarButton
          title="Subscript"
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          X₂
        </ToolbarButton>
        <ToolbarButton
          title="Superscript"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          X²
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap gap-0.5">
        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={async () => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = await promptText({
              title: "Link",
              description:
                "Enter a URL. Leave the field empty and choose Apply to remove the link.",
              label: "URL",
              defaultValue: prev ?? "https://",
              placeholder: "https://",
              confirmLabel: "Apply",
              cancelLabel: "Cancel",
            });
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ─
        </ToolbarButton>
        <ToolbarButton
          title="Clear Format"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          T×
        </ToolbarButton>
      </div>
    </div>
  );
}
