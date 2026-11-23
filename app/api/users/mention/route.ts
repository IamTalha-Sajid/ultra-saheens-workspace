import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth-api";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const { user: caller, error } = await requireRole("admin", "member", "director");
  if (error) return error;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // Allow empty query to show all users for @ mentions
  if (q.length < 1) {
    await connectDB();
    const users = await User.find({})
      .select("name email username")
      .limit(12)
      .lean();

    return NextResponse.json({
      users: users.map((u) => ({
        id: String(u._id),
        name: u.name ?? "",
        username: u.username ?? "",
      })),
    });
  }

  await connectDB();
  const rx = new RegExp(escapeRegExp(q), "i");
  // Directors can't search by email, which would reveal members' addresses.
  const users = await User.find({
    $or:
      caller.role === "director"
        ? [{ name: rx }, { username: rx }]
        : [{ name: rx }, { email: rx }, { username: rx }],
  })
    .select("name email username")
    .limit(12)
    .lean();

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name ?? "",
      username: u.username ?? "",
    })),
  });
}
