import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { createNotificationsForNewMentions } from "@/lib/notifications/sync-mention-notifications";
import Page from "@/models/Page";

async function collectDescendantIds(
  userOid: mongoose.Types.ObjectId,
  rootId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const ids: mongoose.Types.ObjectId[] = [rootId];
  let frontier: mongoose.Types.ObjectId[] = [rootId];
  while (frontier.length > 0) {
    const children = await Page.find({
      userId: userOid,
      parentId: { $in: frontier },
    })
      .select("_id")
      .lean();
    frontier = [];
    for (const c of children) {
      const cid = c._id as mongoose.Types.ObjectId;
      if (!ids.some((x) => x.equals(cid))) {
        ids.push(cid);
        frontier.push(cid);
      }
    }
  }
  return ids;
}

function parsePageContent(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

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
  const page = await Page.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    page: {
      title: page.title,
      icon: page.icon ?? "",
      content: parsePageContent(page.content),
    },
  });
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

  const body = (await request.json()) as {
    title?: string;
    icon?: string;
    content?: unknown;
  };

  await connectDB();
  const pageOid = new mongoose.Types.ObjectId(id);
  const userOid = new mongoose.Types.ObjectId(userId);

  const page = await Page.findOne({ _id: pageOid, userId: userOid });
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previousContentJson = page.content ?? "";

  if (body.title !== undefined) {
    const t = String(body.title).trim() || "Untitled";
    page.title = t.slice(0, 500);
  }
  if (body.icon !== undefined) {
    page.icon = String(body.icon).slice(0, 32);
  }
  if (body.content !== undefined) {
    page.content = JSON.stringify(body.content);
  }

  if (page.isModified("content")) {
    const session = await auth();
    const actorName =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      "Someone";
    await createNotificationsForNewMentions({
      previousContentJson,
      newContent: body.content,
      pageId: pageOid,
      pageTitle: page.title,
      actorId: userOid,
      actorName,
    });
  }

  await page.save();
  return NextResponse.json({ ok: true });
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
  const userOid = new mongoose.Types.ObjectId(userId);
  const rootOid = new mongoose.Types.ObjectId(id);

  const exists = await Page.findOne({ _id: rootOid, userId: userOid }).lean();
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const toRemove = await collectDescendantIds(userOid, rootOid);
  await Page.deleteMany({ _id: { $in: toRemove } });

  return NextResponse.json({ ok: true });
}
