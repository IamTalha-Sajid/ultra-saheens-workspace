import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User, { type UserRole } from "@/models/User";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Session user with the access role read from the database (not the JWT), so
 * demotions and removals take effect immediately. Returns null when signed out
 * or when the account no longer exists.
 */
export async function getSessionUser(): Promise<{ id: string; role: UserRole } | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  await connectDB();
  const user = await User.findById(id).select("role").lean();
  if (!user) return null;
  return { id, role: (user.role as UserRole | undefined) ?? "member" };
}

/**
 * Resolves the caller and checks their role. Returns `{ user }` on success or
 * `{ error }` holding the 401/403 response to return from the route handler.
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<{ user: { id: string; role: UserRole }; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
