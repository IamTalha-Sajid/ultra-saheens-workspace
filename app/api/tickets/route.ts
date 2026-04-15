import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import Ticket from "@/models/Ticket";
import type { TicketDoc } from "@/models/Ticket";
import Counter from "@/models/Counter";
import "@/models/User"; // ensure User schema is registered for populate()

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
  const assigneeList: ReturnType<typeof userToJson>[] = [];
  if (Array.isArray(t.assigneeIds)) {
    for (const rawAssignee of t.assigneeIds) {
      if (isPopulatedUser(rawAssignee)) {
        assigneeList.push(
          userToJson({
            _id: rawAssignee._id,
            name: rawAssignee.name,
            email: rawAssignee.email,
            username: rawAssignee.username,
          })
        );
      }
    }
  }
  const fallbackAssignee = isPopulatedUser(t.assigneeId) ? userToJson(t.assigneeId) : undefined;
  const assigneeIds = assigneeList.length > 0 ? assigneeList : fallbackAssignee ? [fallbackAssignee] : [];
  const creator = isPopulatedUser(t.creatorId)
    ? userToJson(t.creatorId)
    : { _id: String(t.creatorId), name: "", email: "" };

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
    creatorId: creator,
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
    .populate("assigneeIds", "name email username")
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
    assigneeId?: string;
    assigneeIds?: string[];
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

  const assigneeIdsRaw = Array.isArray(body.assigneeIds) ? body.assigneeIds : [];
  const assigneeIds = [...new Set(
    assigneeIdsRaw
      .map((id) => String(id))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
  )].map((id) => new mongoose.Types.ObjectId(id));

  if (assigneeIds.length === 0 && body.assigneeId && mongoose.Types.ObjectId.isValid(body.assigneeId)) {
    assigneeIds.push(new mongoose.Types.ObjectId(body.assigneeId));
  }

  await connectDB();
  const creatorOid = new mongoose.Types.ObjectId(userId);

  // Get next sequence ID
  const counter = await Counter.findOneAndUpdate(
    { name: "ticket" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const doc = await Ticket.create({
    sid: counter.seq,
    title,
    description: "",
    status,
    creatorId: creatorOid,
    assigneeId: assigneeIds[0],
    assigneeIds,
  });

  const populated = await Ticket.findById(doc._id)
    .populate("assigneeId", "name email username")
    .populate("assigneeIds", "name email username")
    .populate("creatorId", "name email username")
    .lean();

  if (!populated) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({
    ticket: serializeTicket(
      populated as unknown as TicketDoc & {
        assigneeId?: PopulatedUser | null;
        assigneeIds?: Array<PopulatedUser | mongoose.Types.ObjectId> | null;
        creatorId: PopulatedUser
      }
    ),
  });
}
