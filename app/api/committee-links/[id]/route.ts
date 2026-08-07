import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeLink from "@/models/CommitteeLink";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as {
    title?: string;
    url?: string;
    description?: string;
    department?: string;
  };

  const title = String(body.title ?? "").trim();
  const url = String(body.url ?? "").trim();
  const description = String(body.description ?? "").trim();
  const department = String(body.department ?? "").trim();

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  await connectDB();
  const updated = await CommitteeLink.findByIdAndUpdate(
    new mongoose.Types.ObjectId(id),
    { title, url, description, department },
    { new: true }
  )
    .populate("userId", "name email username")
    .lean();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uploader = updated.userId as unknown as
    | { _id?: mongoose.Types.ObjectId; name?: string; email?: string; username?: string }
    | null
    | undefined;

  return NextResponse.json({
    link: {
      _id: String(updated._id),
      folderId: updated.folderId ? String(updated.folderId) : null,
      title: updated.title,
      url: updated.url,
      description: updated.description,
      department: updated.department,
      createdAt: updated.createdAt.toISOString(),
      addedBy: {
        _id: uploader?._id ? String(uploader._id) : "",
        name: uploader?.name ?? "",
        email: uploader?.email ?? "",
        username: uploader?.username,
      },
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
  const deleted = await CommitteeLink.findByIdAndDelete(new mongoose.Types.ObjectId(id)).lean();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
