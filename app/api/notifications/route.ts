import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import MentionNotification from "@/models/MentionNotification";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const recipientOid = new mongoose.Types.ObjectId(userId);

  const [notifications, unreadCount] = await Promise.all([
    MentionNotification.find({ recipientId: recipientOid })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean(),
    MentionNotification.countDocuments({ recipientId: recipientOid, read: false }),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: String(n._id),
      read: n.read,
      createdAt:
        n.createdAt instanceof Date
          ? n.createdAt.toISOString()
          : new Date(n.createdAt).toISOString(),
      pageId: n.pageId ? String(n.pageId) : null,
      pageTitle: n.pageTitle ?? "",
      mentionLabel: n.mentionLabel ?? "",
      actorName: n.actorName ?? "",
      type: n.type,
      ticketId: n.ticketId ? String(n.ticketId) : null,
    })),
    unreadCount,
  });
}
