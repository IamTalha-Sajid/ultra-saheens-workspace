import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeFolder from "@/models/CommitteeFolder";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  const type = searchParams.get("type");
  if (type !== "file" && type !== "link")
    return NextResponse.json({ error: "type must be 'file' or 'link'" }, { status: 400 });

  await connectDB();
  const filter = parentId
    ? { type, parentId: new mongoose.Types.ObjectId(parentId) }
    : { type, parentId: null };

  const folders = await CommitteeFolder.find(filter).sort({ name: 1 }).lean();

  return NextResponse.json({
    folders: folders.map((f) => ({
      _id: String(f._id),
      name: f.name,
      parentId: f.parentId ? String(f.parentId) : null,
      createdAt: (f.createdAt as Date).toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { name?: string; parentId?: string | null; type?: string };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  if (body.type !== "file" && body.type !== "link")
    return NextResponse.json({ error: "type must be 'file' or 'link'" }, { status: 400 });

  await connectDB();
  const folder = await CommitteeFolder.create({
    name,
    type: body.type,
    parentId: body.parentId ? new mongoose.Types.ObjectId(body.parentId) : null,
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  return NextResponse.json({
    folder: {
      _id: String(folder._id),
      name: folder.name,
      parentId: folder.parentId ? String(folder.parentId) : null,
      createdAt: folder.createdAt.toISOString(),
    },
  });
}
