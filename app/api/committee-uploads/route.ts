import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import CommitteeUpload from "@/models/CommitteeUpload";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — presentations with embedded media routinely exceed 15MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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

function guessMimeFromExt(name: string): string | null {
  const ext = path.extname(name).toLowerCase();
  const byExt: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  return byExt[ext] ?? null;
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const details = String(form.get("details") ?? "").trim();
    const folderIdField = form.get("folderId");
    const folderId = folderIdField && mongoose.Types.ObjectId.isValid(String(folderIdField))
      ? new mongoose.Types.ObjectId(String(folderIdField))
      : null;
    const file = form.get("file");

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please attach a file" }, { status: 400 });
    }

    // Some browsers/OS combos report an empty or generic MIME type for
    // less common extensions like .pptx — fall back to the file extension
    // instead of rejecting a valid file outright.
    const mimeType = ALLOWED_MIME_TYPES.has(file.type)
      ? file.type
      : guessMimeFromExt(file.name);

    if (!mimeType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const ext = path.extname(file.name) || "";
    const safeBase = sanitizeFileName(path.basename(file.name, ext)) || "document";
    const storedName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeBase}${ext}`;
    const diskDir = path.join(process.cwd(), "public", "uploads", "committee");
    const diskPath = path.join(diskDir, storedName);
    const publicUrl = `/uploads/committee/${storedName}`;

    await mkdir(diskDir, { recursive: true });
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(diskPath, bytes);

    await connectDB();
    const created = await CommitteeUpload.create({
      userId: new mongoose.Types.ObjectId(userId),
      folderId,
      title,
      details,
      originalName: file.name,
      storedName,
      mimeType,
      size: file.size,
      url: publicUrl,
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
