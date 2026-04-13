import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import { collectMentionIdsAndLabels } from "@/lib/tiptap/collect-mentions";
import { sendEmailNotification } from "@/lib/notifications/email-notifier";
import MentionNotification from "@/models/MentionNotification";
import Ticket from "@/models/Ticket";
import TicketComment from "@/models/TicketComment";
import User from "@/models/User";

type PopulatedUser = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email: string;
  username?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { content?: string };
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  await connectDB();
  const ticketOid = new mongoose.Types.ObjectId(ticketId);
  const ticket = await Ticket.findById(ticketOid).select("title").lean();
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authorOid = new mongoose.Types.ObjectId(userId);
  const comment = await TicketComment.create({
    ticketId: ticketOid,
    authorId: authorOid,
    content,
  });

  let mentionMap = new Map<string, string>();
  try {
    const json = JSON.parse(content) as unknown;
    mentionMap = collectMentionIdsAndLabels(json);
  } catch {
    /* plain text comment */
  }

  const session = await auth();
  const actorName =
    session?.user?.name?.trim() ||
    session?.user?.email?.trim() ||
    "Someone";

  const mentionedIds = [...mentionMap.keys()].filter(
    (mid) => mongoose.Types.ObjectId.isValid(mid) && mid !== userId
  );
  if (mentionedIds.length > 0) {
    const oids = mentionedIds.map((mid) => new mongoose.Types.ObjectId(mid));
    const validUsers = await User.find({ _id: { $in: oids } })
      .select("_id")
      .lean();
    const valid = new Set(validUsers.map((u) => String(u._id)));
    const docs = mentionedIds
      .filter((mid) => valid.has(mid))
      .map((mid) => ({
        recipientId: new mongoose.Types.ObjectId(mid),
        actorId: authorOid,
        pageTitle: ticket.title,
        mentionLabel: mentionMap.get(mid) ?? "",
        actorName,
        read: false,
        type: "ticket_comment" as const,
        ticketId: ticketOid,
      }));
    if (docs.length > 0) {
      await MentionNotification.insertMany(docs);
      
      // Send Email Alerts for each mention
      await Promise.all(
        mentionedIds
          .filter((mid) => valid.has(mid))
          .map((mid) => 
            sendEmailNotification({
              recipientId: new mongoose.Types.ObjectId(mid),
              actorName,
              ticketTitle: ticket.title,
              ticketId: ticketOid,
              type: "ticket_comment"
            })
          )
      );
    }
  }

  const populated = await TicketComment.findById(comment._id)
    .populate("authorId", "name email username")
    .lean();

  if (!populated) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({
    comment: {
      _id: String(populated._id),
      content: populated.content,
      authorId: userToJson(populated.authorId as unknown as PopulatedUser),
      createdAt: populated.createdAt.toISOString(),
    },
  });
}
