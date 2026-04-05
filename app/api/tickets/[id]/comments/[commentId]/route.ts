import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import TicketComment from "@/models/TicketComment";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId, commentId } = await context.params;
  if (
    !mongoose.Types.ObjectId.isValid(ticketId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectDB();
  const comment = await TicketComment.findOne({
    _id: new mongoose.Types.ObjectId(commentId),
    ticketId: new mongoose.Types.ObjectId(ticketId),
  });

  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (String(comment.authorId) !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await comment.deleteOne();
  return NextResponse.json({ ok: true });
}
