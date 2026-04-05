import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { isAllowedEmail } from "@/lib/domain";
import User from "@/models/User";

const MIN_PASSWORD = 8;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const name = String(body.name ?? "").trim();
  const emailRaw = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  if (!name || !emailRaw || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 }
    );
  }
  if (!isAllowedEmail(emailRaw)) {
    return NextResponse.json(
      { error: "Only @ultrashaheens.com addresses are allowed." },
      { status: 400 }
    );
  }

  await connectDB();
  const existing = await User.findOne({ email: emailRaw }).lean();
  if (existing) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  await User.create({
    email: emailRaw,
    name: name.slice(0, 120),
    passwordHash,
  });

  return NextResponse.json({ ok: true });
}
