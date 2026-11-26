import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-api";
import { NON_CXO_USER_FILTER } from "@/lib/board";
import { connectDB } from "@/lib/mongodb";
import { userToJson } from "@/lib/api/user-json";
import User from "@/models/User";

export async function GET() {
  const { user: caller, error } = await requireRole("admin", "member", "director");
  if (error) return error;

  await connectDB();
  const users = await User.find(caller.cxo ? {} : NON_CXO_USER_FILTER, "name email username")
    .sort({ name: 1, email: 1 })
    .lean();

  // Directors never see members' email addresses.
  const hideEmail = caller.role === "director";
  return NextResponse.json({
    users: users.map((u) => userToJson(u, { hideEmail })),
  });
}
