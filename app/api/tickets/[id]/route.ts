import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import { collectMentionIdsAndLabels } from "@/lib/tiptap/collect-mentions";
import { tiptapToPlainText } from "@/lib/tiptap/tiptap-to-text";
import MentionNotification from "@/models/MentionNotification";
import { sendEmailNotification } from "@/lib/notifications/email-notifier";
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

function isPopulatedUser(u: unknown): u is PopulatedUser {
  return typeof u === "object" && u !== null && "email" in u;
}

function serializeTicket(
  t: TicketDoc & {
    assigneeId?: PopulatedUser | null;
    assigneeIds?: Array<PopulatedUser | mongoose.Types.ObjectId> | null;
    creatorId: PopulatedUser;
  }
) {
  const assigneeList = Array.isArray(t.assigneeIds)
    ? t.assigneeIds
        .filter((u) => isPopulatedUser(u))
        .map((u) => userToJson(u))
    : [];
  const fallbackAssignee =
    isPopulatedUser(t.assigneeId)
      ? userToJson(t.assigneeId)
      : undefined;
  const assigneeIds = assigneeList.length > 0 ? assigneeList : fallbackAssignee ? [fallbackAssignee] : [];
  return {
    _id: String(t._id),
    sid: t.sid,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    type: t.type,
    labels: t.labels,
    estimate: t.estimate,
    assigneeId: assigneeIds[0],
    assigneeIds,
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
    .populate("assigneeIds", "name email username")
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
      ticket as unknown as TicketDoc & {
        assigneeId?: PopulatedUser | null;
        assigneeIds?: Array<PopulatedUser | mongoose.Types.ObjectId> | null;
        creatorId: PopulatedUser
      }
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

function parseAssigneeIds(raw: unknown): mongoose.Types.ObjectId[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const uniq = [...new Set(raw.map((x) => String(x)).filter((id) => mongoose.Types.ObjectId.isValid(id)))];
  return uniq.map((id) => new mongoose.Types.ObjectId(id));
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

  const prevAssignees = new Set<string>(
    Array.isArray(ticket.assigneeIds) && ticket.assigneeIds.length > 0
      ? ticket.assigneeIds.map((assigneeId: mongoose.Types.ObjectId) => String(assigneeId))
      : ticket.assigneeId
        ? [String(ticket.assigneeId)]
        : []
  );

  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (t) ticket.title = t;
  }
  const oldDescription = ticket.description;
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
  const nextAssigneeOids = parseAssigneeIds(body.assigneeIds);

  if (nextAssigneeOids !== undefined) {
    if (nextAssigneeOids.length === 0) {
      ticket.assigneeIds = [];
      ticket.set("assigneeId", undefined);
    } else {
      const validUsers = await User.find({ _id: { $in: nextAssigneeOids } }).select("_id").lean();
      const valid = new Set(validUsers.map((u) => String(u._id)));
      if (valid.size !== nextAssigneeOids.length) {
        return NextResponse.json({ error: "One or more assignees not found" }, { status: 400 });
      }
      ticket.assigneeIds = nextAssigneeOids;
      ticket.assigneeId = nextAssigneeOids[0];
    }
  } else
  if (nextAssigneeOid !== undefined) {
    if (nextAssigneeOid === null) {
      ticket.assigneeIds = [];
      ticket.set("assigneeId", undefined);
    } else {
      const u = await User.findById(nextAssigneeOid).select("_id").lean();
      if (!u) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      }
      ticket.assigneeId = nextAssigneeOid;
      ticket.assigneeIds = [nextAssigneeOid];
    }
  }

  await ticket.save();

  const nextAssignees = new Set<string>(
    Array.isArray(ticket.assigneeIds) && ticket.assigneeIds.length > 0
      ? ticket.assigneeIds.map((assigneeId: mongoose.Types.ObjectId) => String(assigneeId))
      : ticket.assigneeId
        ? [String(ticket.assigneeId)]
        : []
  );
  const addedAssignees = [...nextAssignees].filter((id) => !prevAssignees.has(id) && id !== userId);
  if (addedAssignees.length > 0) {
    const session = await auth();
    const actorName =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      "Someone";
    await MentionNotification.insertMany(
      addedAssignees.map((assignee) => ({
        recipientId: new mongoose.Types.ObjectId(assignee),
        actorId: new mongoose.Types.ObjectId(userId),
        pageTitle: ticket.title,
        mentionLabel: "assigned you to a ticket",
        actorName,
        read: false,
        type: "ticket_assigned" as const,
        ticketId: ticket._id,
      }))
    );

    await Promise.all(
      addedAssignees.map((assignee) =>
        sendEmailNotification({
          recipientId: new mongoose.Types.ObjectId(assignee),
          actorName,
          ticketTitle: ticket.title,
          ticketId: ticket._id,
          type: "ticket_assigned",
        })
      )
    );
  }

  // Handle Mentions in Description (only if changed)
  if (ticket.description !== oldDescription) {
    let oldIds = new Set<string>();
    let newMap = new Map<string, string>();
    try {
      if (oldDescription) {
        const oldJson = JSON.parse(oldDescription);
        const oldIdentities = collectMentionIdsAndLabels(oldJson);
        oldIds = new Set(oldIdentities.keys());
      }
      if (ticket.description) {
        const newJson = JSON.parse(ticket.description);
        newMap = collectMentionIdsAndLabels(newJson);
      }
    } catch { /* not JSON */ }

    const addedIds = [...newMap.keys()].filter(
      (mid) => !oldIds.has(mid) && mid !== userId && mongoose.Types.ObjectId.isValid(mid)
    );

    if (addedIds.length > 0) {
      const oids = addedIds.map((mid) => new mongoose.Types.ObjectId(mid));
      const validUsers = await User.find({ _id: { $in: oids } }).select("_id").lean();
      const valid = new Set(validUsers.map((u) => String(u._id)));
      
      const session = await auth();
      const actorName = session?.user?.name?.trim() || session?.user?.email?.trim() || "Someone";

      const docs = addedIds
        .filter((mid) => valid.has(mid))
        .map((mid) => ({
          recipientId: new mongoose.Types.ObjectId(mid),
          actorId: new mongoose.Types.ObjectId(userId),
          pageTitle: ticket.title,
          mentionLabel: newMap.get(mid) ?? "",
          actorName,
          read: false,
          type: "mention" as const,
          ticketId: ticket._id,
        }));

      if (docs.length > 0) {
        await MentionNotification.insertMany(docs);
        
        let descText = "";
        try {
          const json = JSON.parse(ticket.description);
          descText = tiptapToPlainText(json);
        } catch {
          descText = ticket.description;
        }

        await Promise.all(
          docs.map(doc => 
            sendEmailNotification({
              recipientId: doc.recipientId,
              actorName,
              ticketTitle: ticket.title,
              ticketId: ticket._id,
              type: "mention",
              content: descText
            })
          )
        );
      }
    }
  }

  const populated = await Ticket.findById(ticket._id)
    .populate("assigneeId", "name email username")
    .populate("assigneeIds", "name email username")
    .populate("creatorId", "name email username")
    .lean();

  return NextResponse.json({
    ticket: populated
      ? serializeTicket(
          populated as unknown as TicketDoc & {
            assigneeId?: PopulatedUser | null;
            assigneeIds?: Array<PopulatedUser | mongoose.Types.ObjectId> | null;
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
