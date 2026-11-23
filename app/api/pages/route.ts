import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUserId } from "@/lib/auth-api";
import { redactForDirectors } from "@/lib/redact-emails";
import { connectDB } from "@/lib/mongodb";
import Page from "@/models/Page";

type PopulatedCreator = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  username?: string;
};

function createdByFromPage(p: {
  userId: PopulatedCreator | mongoose.Types.ObjectId | null | undefined;
}) {
  const u = p.userId;
  // Populated user doc (directors have no email, so don't test for it).
  if (u && typeof u === "object" && !(u instanceof mongoose.Types.ObjectId)) {
    return {
      _id: String(u._id),
      name: u.name ?? "",
      email: u.email ?? "",
      username: u.username,
    };
  }
  return {
    _id: u ? String(u) : "",
    name: "",
    email: "",
    username: undefined as string | undefined,
  };
}

function listItem(
  page: {
    _id: mongoose.Types.ObjectId;
    title: string;
    icon: string;
    parentId: mongoose.Types.ObjectId | null;
    order: number;
    updatedAt: Date;
    userId: PopulatedCreator | mongoose.Types.ObjectId;
  }
) {
  return {
    _id: String(page._id),
    title: page.title,
    icon: page.icon ?? "",
    parentId: page.parentId ? String(page.parentId) : null,
    order: page.order,
    updatedAt: page.updatedAt.toISOString(),
    createdBy: createdByFromPage(page),
  };
}

export const GET = redactForDirectors(handleGET);
async function handleGET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const pages = await Page.find({})
    .sort({ parentId: 1, order: 1, updatedAt: -1 })
    .populate("userId", "name email username")
    .lean();

  return NextResponse.json({
    pages: pages.map((p) =>
      listItem({
        _id: p._id,
        title: p.title,
        icon: p.icon,
        parentId: p.parentId ?? null,
        order: p.order,
        updatedAt: p.updatedAt,
        userId: p.userId as PopulatedCreator | mongoose.Types.ObjectId,
      })
    ),
  });
}

export const POST = redactForDirectors(handlePOST);
async function handlePOST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    parentId?: string | null;
  };
  const title = String(body.title ?? "Untitled").trim() || "Untitled";
  let parentId: mongoose.Types.ObjectId | null = null;
  if (body.parentId) {
    if (!mongoose.Types.ObjectId.isValid(body.parentId)) {
      return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    }
    parentId = new mongoose.Types.ObjectId(body.parentId);
  }

  await connectDB();
  const userOid = new mongoose.Types.ObjectId(userId);

  if (parentId) {
    const parent = await Page.findById(parentId).lean();
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }
  }

  const maxOrder = await Page.findOne({ parentId })
    .sort({ order: -1 })
    .select("order")
    .lean();
  const order = (maxOrder?.order ?? -1) + 1;

  const page = await Page.create({
    userId: userOid,
    title,
    parentId,
    order,
  });

  return NextResponse.json({
    page: { _id: String(page._id) },
  });
}
