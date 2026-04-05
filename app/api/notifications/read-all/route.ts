import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import MentionNotification from "@/models/MentionNotification";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  await MentionNotification.updateMany(
    { recipientId: new mongoose.Types.ObjectId(userId), read: false },
    { $set: { read: true } }
  );

  return NextResponse.json({ ok: true });
}
