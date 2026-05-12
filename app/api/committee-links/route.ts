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

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const rows = await CommitteeLink.find()
    .populate("userId", "name email username")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    links: rows.map((row) => ({
      _id: String(row._id),
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
  const created = await CommitteeLink.create({
    userId: new mongoose.Types.ObjectId(userId),
    title,
    url,
    description,
    department,
  });

  return NextResponse.json({
    link: {
      _id: String(created._id),
      title: created.title,
      url: created.url,
      description: created.description,
      department: created.department,
      createdAt: created.createdAt.toISOString(),
      addedBy: { _id: userId, name: "", email: "" },
    },
  });
}
