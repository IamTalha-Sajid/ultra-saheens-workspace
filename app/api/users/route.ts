import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import User from "@/models/User";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const users = await User.find({}, "name email username")
    .sort({ name: 1, email: 1 })
    .lean();

  return NextResponse.json({
    users: users.map((u) => userToJson(u)),
  });
}
