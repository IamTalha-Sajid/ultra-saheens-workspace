import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { hash } from "bcryptjs";
import { requireRole } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const MIN_PASSWORD = 8;

/** Admin-only: set a new password for a director account. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const body = (await request.json()) as { password?: string };
  const password = String(body.password ?? "");
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 }
    );
  }

  await connectDB();
  // Only directors: members and admins manage their own passwords in Profile.
  const result = await User.updateOne(
    { _id: id, role: "director" },
    { $set: { passwordHash: await hash(password, 12) } }
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
