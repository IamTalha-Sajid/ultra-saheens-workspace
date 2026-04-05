import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import MentionNotification from "@/models/MentionNotification";

export async function PATCH(
  request: Request,
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

  const body = (await request.json()) as { read?: boolean };
  if (typeof body.read !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await connectDB();
  const n = await MentionNotification.findOne({
    _id: new mongoose.Types.ObjectId(id),
    recipientId: new mongoose.Types.ObjectId(userId),
  });

  if (!n) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  n.read = body.read;
  await n.save();

  return NextResponse.json({ ok: true });
}
