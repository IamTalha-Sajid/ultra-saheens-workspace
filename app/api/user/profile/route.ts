import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/domain";
import { connectDB } from "@/lib/mongodb";
import {
  normalizeUsernameInput,
  validateUsernameFormat,
} from "@/lib/username";
import User from "@/models/User";

const MIN_PASSWORD = 8;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    email: user.email,
    name: user.name ?? "",
    username: user.username ?? "",
    designation: user.designation ?? "",
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    username?: string;
    designation?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newEmail =
    body.email !== undefined
      ? String(body.email).toLowerCase().trim()
      : undefined;
  const wantsEmail =
    newEmail !== undefined && newEmail.length > 0 && newEmail !== user.email;
  const wantsPassword =
    body.newPassword !== undefined && String(body.newPassword).length > 0;
  const wantsName = body.name !== undefined;
  const wantsUsername = body.username !== undefined;
  const wantsDesignation = body.designation !== undefined;

  let usernameNormalized = "";
  let usernameDirty = false;
  if (wantsUsername) {
    usernameNormalized = normalizeUsernameInput(String(body.username ?? ""));
    const prev = (user.username ?? "").toLowerCase().trim();
    usernameDirty = usernameNormalized !== prev;
    if (usernameDirty) {
      const formatError = validateUsernameFormat(usernameNormalized);
      if (formatError) {
        return NextResponse.json({ error: formatError }, { status: 400 });
      }
      if (usernameNormalized !== "") {
        const taken = await User.findOne({
          username: usernameNormalized,
          _id: { $ne: user._id },
        }).lean();
        if (taken) {
          return NextResponse.json(
            { error: "That username is already taken." },
            { status: 409 }
          );
        }
      }
    }
  }

  if (
    !wantsName &&
    !wantsUsername &&
    !wantsDesignation &&
    !wantsEmail &&
    !wantsPassword
  ) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  if (wantsEmail || wantsPassword) {
    const current = body.currentPassword;
    if (typeof current !== "string" || !current) {
      return NextResponse.json(
        {
          error:
            "Current password is required to change your email or password.",
        },
        { status: 400 }
      );
    }
    const ok = await compare(current, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 }
      );
    }
  }

  if (wantsName) {
    const name = String(body.name ?? "").trim();
    if (name.length > 120) {
      return NextResponse.json(
        { error: "Name must be at most 120 characters." },
        { status: 400 }
      );
    }
    if (name !== (user.name ?? "").trim()) {
      user.set("name", name);
    }
  }

  if (wantsDesignation) {
    const des = String(body.designation ?? "").trim();
    if (des.length > 120) {
      return NextResponse.json(
        { error: "Designation must be at most 120 characters." },
        { status: 400 }
      );
    }
    if (des !== (user.designation ?? "").trim()) {
      user.set("designation", des);
    }
  }

  if (wantsEmail && newEmail) {
    if (!isAllowedEmail(newEmail)) {
      return NextResponse.json(
        { error: "Only @ultrashaheens.com addresses are allowed." },
        { status: 400 }
      );
    }
    const taken = await User.findOne({ email: newEmail }).lean();
    if (taken) {
      return NextResponse.json(
        { error: "That email is already in use." },
        { status: 409 }
      );
    }
    user.email = newEmail;
  }

  if (wantsPassword) {
    const newPassword = String(body.newPassword);
    if (newPassword.length < MIN_PASSWORD) {
      return NextResponse.json(
        {
          error: `New password must be at least ${MIN_PASSWORD} characters.`,
        },
        { status: 400 }
      );
    }
    user.passwordHash = await hash(newPassword, 12);
  }

  if (user.isModified()) {
    await user.save();
  }

  if (wantsUsername && usernameDirty) {
    if (usernameNormalized === "") {
      await User.updateOne({ _id: user._id }, { $unset: { username: 1 } });
    } else {
      await User.updateOne(
        { _id: user._id },
        { $set: { username: usernameNormalized } }
      );
    }
  }

  const fresh = await User.findById(userId).lean();
  if (!fresh) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: fresh.email,
      name: fresh.name ?? "",
      username: fresh.username ?? "",
      designation: fresh.designation ?? "",
    },
  });
}
