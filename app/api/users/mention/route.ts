import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import User from "@/models/User";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  await connectDB();
  const rx = new RegExp(escapeRegExp(q), "i");
  const users = await User.find({
    $or: [{ name: rx }, { email: rx }, { username: rx }],
  })
    .select("name email username")
    .limit(12)
    .lean();

  return NextResponse.json({
    users: users.map((u) => userToJson(u)),
  });
}
