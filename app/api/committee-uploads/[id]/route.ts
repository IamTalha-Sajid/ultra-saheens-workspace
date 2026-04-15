import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeUpload from "@/models/CommitteeUpload";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDB();
  const upload = await CommitteeUpload.findByIdAndDelete(new mongoose.Types.ObjectId(id)).lean();
  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const diskPath = path.join(process.cwd(), "public", "uploads", "committee", upload.storedName);
  try {
    await unlink(diskPath);
  } catch {
    // Best-effort cleanup. DB record is already removed.
  }

  return NextResponse.json({ ok: true });
}
