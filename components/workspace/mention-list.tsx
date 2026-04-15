"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type MentionUser = {
  id: string;
  username: string;
  name: string;
};

function mentionLabel(u: MentionUser) {
  if (u.username) return u.username;
  return u.name.trim() || u.id;
}

export type MentionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type MentionListProps = {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
};

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedRef = useRef(0);
    selectedRef.current = selectedIndex;

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command({ id: item.id, label: mentionLabel(item) });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (!props.items.length) return false;
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex(
            (i) => (i + props.items.length - 1) % props.items.length
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((i) => (i + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          selectItem(selectedRef.current);
          return true;
        }
        return false;
      },
    }));

    if (!props.items.length) {
      return (
        <div className="mention-list-empty rounded-2xl border border-[var(--glass-border)] bg-[rgba(20,20,22,0.95)] px-3 py-2.5 text-sm text-[var(--text-muted)] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl">
          No users found
        </div>
      );
    }

    return (
      <div className="mention-list max-h-[min(280px,40vh)] min-w-[220px] overflow-y-auto rounded-2xl border border-[var(--glass-border-bright)] bg-[rgba(20,20,22,0.95)] py-1 shadow-2xl backdrop-blur-xl">
        {props.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-all ${index === selectedIndex
                ? "bg-[var(--accent-glow)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-[var(--text-muted)] hover:bg-white/[0.07] hover:text-white"
              }`}
            onClick={() => selectItem(index)}
          >
            <span className="font-semibold text-white">{mentionLabel(item)}</span>
            {item.name.trim() && item.username ? (
              <span className="text-xs font-medium text-[var(--text-muted)]">{item.name}</span>
            ) : null}
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
