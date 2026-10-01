import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { MAX_FILE_SIZE, resolveMimeType } from "@/lib/committee-upload";
import CommitteeUpload from "@/models/CommitteeUpload";

function uploaderToJson(raw: unknown): { _id: string; name: string; email: string; username?: string } {
  const user = raw as
    | {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        email?: string;
        username?: string;
      }
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
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderIdParam = searchParams.get("folderId");

  await connectDB();
  const filter = folderIdParam
    ? { folderId: new mongoose.Types.ObjectId(folderIdParam) }
    : { $or: [{ folderId: null }, { folderId: { $exists: false } }] };

  const rows = await CommitteeUpload.find(filter)
    .populate("userId", "name email username")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    uploads: rows.map((row) => ({
      _id: String(row._id),
      folderId: row.folderId ? String(row.folderId) : null,
      title: row.title,
      details: row.details,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      url: row.url,
      createdAt: row.createdAt.toISOString(),
      uploadedBy: uploaderToJson(row.userId),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      title?: string;
      details?: string;
      folderId?: string | null;
      url?: string;
      pathname?: string;
      originalName?: string;
      mimeType?: string;
      size?: number;
    };
    const title = String(body.title ?? "").trim();
    const details = String(body.details ?? "").trim();
    const folderId = body.folderId && mongoose.Types.ObjectId.isValid(body.folderId)
      ? new mongoose.Types.ObjectId(body.folderId)
      : null;
    const originalName = String(body.originalName ?? "");
    const url = String(body.url ?? "");
    const size = Number(body.size);

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!originalName || !body.pathname || !Number.isFinite(size)) {
      return NextResponse.json({ error: "Please attach a file" }, { status: 400 });
    }
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }
    const mimeType = resolveMimeType(originalName, String(body.mimeType ?? ""));
    if (!mimeType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
    }

    await connectDB();
    const created = await CommitteeUpload.create({
      userId: new mongoose.Types.ObjectId(userId),
      folderId,
      title,
      details,
      originalName,
      storedName: body.pathname,
      mimeType,
      size,
      url,
    });

    return NextResponse.json({
      upload: {
        _id: String(created._id),
        title: created.title,
        details: created.details,
        originalName: created.originalName,
        mimeType: created.mimeType,
        size: created.size,
        url: created.url,
        createdAt: created.createdAt.toISOString(),
        uploadedBy: {
          _id: userId,
          name: "",
          email: "",
        },
      },
    });
  } catch (err) {
    console.error("committee-uploads POST failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
