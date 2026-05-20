import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeLink from "@/models/CommitteeLink";

function uploaderToJson(raw: unknown): { _id: string; name: string; email: string; username?: string } {
  const user = raw as
    | { _id?: mongoose.Types.ObjectId; name?: string; email?: string; username?: string }
    | null
    | undefined;
  return {
    _id: user?._id ? String(user._id) : "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    username: user?.username,
  };
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folderIdParam = searchParams.get("folderId");

  await connectDB();
  const filter = folderIdParam
    ? { folderId: new mongoose.Types.ObjectId(folderIdParam) }
    : { $or: [{ folderId: null }, { folderId: { $exists: false } }] };

  const rows = await CommitteeLink.find(filter)
    .populate("userId", "name email username")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    links: rows.map((row) => ({
      _id: String(row._id),
      folderId: row.folderId ? String(row.folderId) : null,
      title: row.title,
      url: row.url,
      description: row.description,
      department: row.department,
      createdAt: row.createdAt.toISOString(),
      addedBy: uploaderToJson(row.userId),
    })),
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    title?: string;
    url?: string;
    description?: string;
    department?: string;
    folderId?: string | null;
  };

  const title = String(body.title ?? "").trim();
  const url = String(body.url ?? "").trim();
  const description = String(body.description ?? "").trim();
  const department = String(body.department ?? "").trim();
  const folderId = body.folderId && mongoose.Types.ObjectId.isValid(body.folderId)
    ? new mongoose.Types.ObjectId(body.folderId)
    : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  await connectDB();
  const created = await CommitteeLink.create({
    userId: new mongoose.Types.ObjectId(userId),
    folderId,
    title,
    url,
    description,
    department,
  });

  return NextResponse.json({
    link: {
      _id: String(created._id),
      folderId: created.folderId ? String(created.folderId) : null,
      title: created.title,
      url: created.url,
      description: created.description,
      department: created.department,
      createdAt: created.createdAt.toISOString(),
      addedBy: { _id: userId, name: "", email: "" },
    },
  });
}
