import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeFolder from "@/models/CommitteeFolder";
import CommitteeUpload from "@/models/CommitteeUpload";

async function cascadeDelete(folderId: mongoose.Types.ObjectId): Promise<void> {
  const files = await CommitteeUpload.find({ folderId }).lean();
  await Promise.all(
    files.map(async (f) => {
      const diskPath = path.join(process.cwd(), "public", "uploads", "committee", f.storedName);
      try { await unlink(diskPath); } catch { /* best-effort */ }
    })
  );
  await CommitteeUpload.deleteMany({ folderId });

  const subfolders = await CommitteeFolder.find({ parentId: folderId }).lean();
  await Promise.all(subfolders.map((s) => cascadeDelete(s._id as mongoose.Types.ObjectId)));
  await CommitteeFolder.findByIdAndDelete(folderId);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  await cascadeDelete(new mongoose.Types.ObjectId(id));

  return NextResponse.json({ ok: true });
}
