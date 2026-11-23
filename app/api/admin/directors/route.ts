import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { requireRole } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { normalizeUsernameInput, validateUsernameFormat } from "@/lib/username";
import User from "@/models/User";

const MIN_PASSWORD = 8;

/** Admin-only: create a director account (username + password, no email). */
export async function POST(request: Request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    username?: string;
    designation?: string;
    password?: string;
  };

  const name = String(body.name ?? "").trim();
  const username = normalizeUsernameInput(String(body.username ?? ""));
  const designation = String(body.designation ?? "").trim();
  const password = String(body.password ?? "");

  if (!name || !username || !password) {
    return NextResponse.json(
      { error: "Name, username and password are required." },
      { status: 400 }
    );
  }
  if (name.length > 120 || designation.length > 120) {
    return NextResponse.json(
      { error: "Name and designation must be at most 120 characters." },
      { status: 400 }
    );
  }
  const formatError = validateUsernameFormat(username);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 }
    );
  }

  await connectDB();
  const taken = await User.findOne({ username }).lean();
  if (taken) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const created = await User.create({
    name,
    username,
    designation,
    role: "director",
    passwordHash: await hash(password, 12),
  });

  return NextResponse.json({
    ok: true,
    director: { _id: String(created._id), name, username, designation },
  });
}
