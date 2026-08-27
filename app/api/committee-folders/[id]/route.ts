import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeFolder from "@/models/CommitteeFolder";
import CommitteeUpload from "@/models/CommitteeUpload";
import CommitteeLink from "@/models/CommitteeLink";

async function cascadeDelete(folderId: mongoose.Types.ObjectId, type: "file" | "link"): Promise<void> {
  if (type === "file") {
    const files = await CommitteeUpload.find({ folderId }).lean();
    await Promise.all(
      files.map(async (f) => {
        const diskPath = path.join(process.cwd(), "public", "uploads", "committee", f.storedName);
        try { await unlink(diskPath); } catch { /* best-effort */ }
      })
    );
    await CommitteeUpload.deleteMany({ folderId });
  } else {
    await CommitteeLink.deleteMany({ folderId });
  }

  const subfolders = await CommitteeFolder.find({ parentId: folderId, type }).lean();
  await Promise.all(subfolders.map((s) => cascadeDelete(s._id as mongoose.Types.ObjectId, type)));
  await CommitteeFolder.findByIdAndDelete(folderId);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

  await connectDB();
  const folder = await CommitteeFolder.findByIdAndUpdate(id, { name }, { new: true }).lean();
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    folder: {
      _id: String(folder._id),
      name: folder.name,
      parentId: folder.parentId ? String(folder.parentId) : null,
      createdAt: folder.createdAt.toISOString(),
    },
  });
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
  const folder = await CommitteeFolder.findById(id).lean();
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await cascadeDelete(new mongoose.Types.ObjectId(id), folder.type);

  return NextResponse.json({ ok: true });
}
