import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import Ticket from "@/models/Ticket";
import type { TicketDoc } from "@/models/Ticket";

type PopulatedUser = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email: string;
  username?: string;
};

function serializeTicket(
  t: TicketDoc & {
    assigneeId?: PopulatedUser | null;
    creatorId: PopulatedUser;
  }
) {
  const assignee = t.assigneeId;
  return {
    _id: String(t._id),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    type: t.type,
    labels: t.labels,
    estimate: t.estimate,
    assigneeId: assignee ? userToJson(assignee) : undefined,
    creatorId: userToJson(t.creatorId),
    createdAt: t.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const archivedParam = new URL(request.url).searchParams.get("archived");
  const archived = archivedParam === "true";

  await connectDB();
  const tickets = await Ticket.find({ archived })
    .sort({ createdAt: -1 })
    .populate("assigneeId", "name email username")
    .populate("creatorId", "name email username")
    .lean();

  return NextResponse.json({
    tickets: tickets.map((t) =>
      serializeTicket(t as unknown as TicketDoc & { assigneeId?: PopulatedUser | null; creatorId: PopulatedUser })
    ),
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    status?: TicketDoc["status"];
  };
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const status = body.status ?? "Todo";
  const allowed: TicketDoc["status"][] = ["Todo", "In progress", "Blocked", "Done"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();
  const creatorOid = new mongoose.Types.ObjectId(userId);

  const doc = await Ticket.create({
    title,
    description: "",
    status,
    creatorId: creatorOid,
  });

  const populated = await Ticket.findById(doc._id)
    .populate("assigneeId", "name email username")
    .populate("creatorId", "name email username")
    .lean();

  if (!populated) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({
    ticket: serializeTicket(
      populated as unknown as TicketDoc & { assigneeId?: PopulatedUser | null; creatorId: PopulatedUser }
    ),
  });
}
