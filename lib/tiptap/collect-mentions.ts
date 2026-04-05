import mongoose from "mongoose";

function walkContent(
  node: unknown,
  onMention: (id: string, label: string) => void
): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    type?: string;
    attrs?: { id?: string; label?: string };
    content?: unknown[];
  };
  if (n.type === "mention" && n.attrs?.id) {
    const id = String(n.attrs.id);
    if (mongoose.Types.ObjectId.isValid(id)) {
      onMention(id, n.attrs.label ?? "");
    }
  }
  if (Array.isArray(n.content)) {
    for (const c of n.content) walkContent(c, onMention);
  }
}

/** Unique user ids mentioned anywhere in the doc (first occurrence wins for label). */
export function collectMentionIdsAndLabels(
  content: unknown
): Map<string, string> {
  const map = new Map<string, string>();
  walkContent(content, (id, label) => {
    if (!map.has(id)) map.set(id, label);
  });
  return map;
}

export function collectMentionIdSetFromJsonString(jsonStr: string): Set<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr || "{}");
  } catch {
    return new Set();
  }
  const ids = new Set<string>();
  walkContent(parsed, (id) => ids.add(id));
  return ids;
}
