import type { Types } from "mongoose";
import Page from "@/models/Page";

/** Collect page id and all descendant ids for this user. */
export async function collectDescendantIds(
  userId: Types.ObjectId,
  rootId: Types.ObjectId
): Promise<Types.ObjectId[]> {
  const all = await Page.find({ userId }).select("_id parentId").lean();
  const byParent = new Map<string, Types.ObjectId[]>();
  for (const row of all) {
    const p = row.parentId ? String(row.parentId) : "";
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(row._id as Types.ObjectId);
  }
  const out: Types.ObjectId[] = [];
  const walk = (id: Types.ObjectId) => {
    out.push(id);
    const key = String(id);
    for (const c of byParent.get(key) ?? []) walk(c);
  };
  walk(rootId);
  return out;
}
