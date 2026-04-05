"use client";

import dynamic from "next/dynamic";
import { Theme, type EmojiClickData } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type EmojiPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onClear: () => void;
};

export function EmojiPickerModal({
  open,
  onClose,
  onSelect,
  onClear,
}: EmojiPickerModalProps) {
  if (!open) return null;

  const handleEmoji = (data: EmojiClickData) => {
    onSelect(data.emoji);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Choose page icon"
        className="glass-card glass-card-elevated max-h-[min(90vh,520px)] w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/[0.12] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.1] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Page icon</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="text-xs font-medium text-[var(--xanadu)] transition-colors hover:text-white"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] px-2 py-1 text-[var(--xanadu)] transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="max-h-[min(72vh,440px)] overflow-auto p-2">
          <EmojiPicker
            onEmojiClick={handleEmoji}
            theme={Theme.DARK}
            width={332}
            height={380}
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            searchPlaceHolder="Search emojis"
          />
        </div>
      </div>
    </div>
  );
}
