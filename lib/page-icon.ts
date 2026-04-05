/**
 * Page icon is a single emoji (or ZWJ sequence), stored separately from title.
 */

const MAX_BYTES = 32;

export function normalizePageIcon(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return "";
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return "";
  let first: string;
  try {
    const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
    const it = seg.segment(t);
    const one = [...it][0];
    first = one?.segment ?? t.slice(0, 1);
  } catch {
    first = [...t][0] ?? "";
  }
  if (!first) return "";
  if (new TextEncoder().encode(first).length > MAX_BYTES) return "";
  return first;
}
