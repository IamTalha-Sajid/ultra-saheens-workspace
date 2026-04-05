import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import MentionNotification from "@/models/MentionNotification";
import Ticket from "@/models/Ticket";
import TicketComment from "@/models/TicketComment";
import User from "@/models/User";
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

const STATUSES: TicketDoc["status"][] = ["Todo", "In progress", "Blocked", "Done"];
const PRIORITIES: TicketDoc["priority"][] = [
  "Highest",
  "High",
  "Medium",
  "Low",
  "Lowest",
];
const TYPES: TicketDoc["type"][] = ["Task", "Bug", "Story", "Epic"];

export async function GET(
  _request: Request,
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

  await connectDB();
  const oid = new mongoose.Types.ObjectId(id);

  const ticket = await Ticket.findById(oid)
    .populate("assigneeId", "name email username")
    .populate("creatorId", "name email username")
    .lean();

  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await TicketComment.find({ ticketId: oid })
    .sort({ createdAt: 1 })
    .populate("authorId", "name email username")
    .lean();

  const commentPayload = comments.map((c) => ({
    _id: String(c._id),
    content: c.content,
    authorId: userToJson(c.authorId as unknown as PopulatedUser),
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({
    ticket: serializeTicket(
      ticket as unknown as TicketDoc & { assigneeId?: PopulatedUser | null; creatorId: PopulatedUser }
    ),
    comments: commentPayload,
  });
}

function parseAssigneeId(raw: unknown): mongoose.Types.ObjectId | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw === "string" && mongoose.Types.ObjectId.isValid(raw)) {
    return new mongoose.Types.ObjectId(raw);
  }
  if (typeof raw === "object" && raw !== null && "_id" in raw) {
    const id = String((raw as { _id: string })._id);
    if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  }
  return undefined;
}

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

  const body = (await request.json()) as Record<string, unknown>;

  await connectDB();
  const ticket = await Ticket.findById(new mongoose.Types.ObjectId(id));
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prevAssignee =
    ticket.assigneeId != null ? String(ticket.assigneeId) : null;

  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (t) ticket.title = t;
  }
  if (body.description !== undefined) {
    ticket.description = String(body.description);
  }
  if (body.status !== undefined) {
    const s = body.status as TicketDoc["status"];
    if (!STATUSES.includes(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    ticket.status = s;
    if (s === "Done") {
      if (!ticket.doneAt) ticket.doneAt = new Date();
    } else {
      ticket.doneAt = undefined;
    }
  }
  if (body.priority !== undefined) {
    const p = body.priority as TicketDoc["priority"];
    if (!PRIORITIES.includes(p)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    ticket.priority = p;
  }
  if (body.type !== undefined) {
    const ty = body.type as TicketDoc["type"];
    if (!TYPES.includes(ty)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    ticket.type = ty;
  }
  if (body.labels !== undefined) {
    ticket.labels = Array.isArray(body.labels)
      ? body.labels.map((x) => String(x))
      : [];
  }
  if (body.estimate !== undefined) {
    ticket.estimate = String(body.estimate);
  }
  if (body.archived !== undefined) {
    ticket.archived = Boolean(body.archived);
  }

  const nextAssigneeOid = parseAssigneeId(body.assigneeId);
  if (nextAssigneeOid !== undefined) {
    if (nextAssigneeOid === null) {
      ticket.set("assigneeId", undefined);
    } else {
      const u = await User.findById(nextAssigneeOid).select("_id").lean();
      if (!u) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      }
      ticket.assigneeId = nextAssigneeOid;
    }
  }

  await ticket.save();

  const nextAssignee =
    ticket.assigneeId != null ? String(ticket.assigneeId) : null;
  if (
    nextAssignee &&
    nextAssignee !== prevAssignee &&
    nextAssignee !== userId
  ) {
    const session = await auth();
    const actorName =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      "Someone";
    await MentionNotification.create({
      recipientId: new mongoose.Types.ObjectId(nextAssignee),
      actorId: new mongoose.Types.ObjectId(userId),
      pageTitle: ticket.title,
      mentionLabel: "assigned you to a ticket",
      actorName,
      read: false,
      type: "ticket_assigned",
      ticketId: ticket._id,
    });
  }

  const populated = await Ticket.findById(ticket._id)
    .populate("assigneeId", "name email username")
    .populate("creatorId", "name email username")
    .lean();

  return NextResponse.json({
    ticket: populated
      ? serializeTicket(
          populated as unknown as TicketDoc & {
            assigneeId?: PopulatedUser | null;
            creatorId: PopulatedUser;
          }
        )
      : null,
  });
}

export async function DELETE(
  _request: Request,
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

  await connectDB();
  const oid = new mongoose.Types.ObjectId(id);
  const ticket = await Ticket.findByIdAndDelete(oid);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await TicketComment.deleteMany({ ticketId: oid });
  await MentionNotification.deleteMany({ ticketId: oid });

  return NextResponse.json({ ok: true });
}
