import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User, { type UserRole } from "@/models/User";
import { isCxo, resolveBoard, type Board } from "@/lib/board";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Session user with the access role read from the database (not the JWT), so
 * demotions and removals take effect immediately. Returns null when signed out
 * or when the account no longer exists.
 */
export async function getSessionUser(): Promise<{ id: string; role: UserRole; cxo: boolean } | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  await connectDB();
  const user = await User.findById(id).select("role email username").lean();
  if (!user) return null;
  return { id, role: (user.role as UserRole | undefined) ?? "member", cxo: isCxo(user) };
}

/** Signed-in user's CXO status and the board they are currently on (for server pages/layouts). */
export async function getSessionBoard(): Promise<{ cxo: boolean; board: Board } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return { cxo: user.cxo, board: await resolveBoard(user.cxo) };
}

/**
 * Resolves the caller and checks their role. Returns `{ user }` on success or
 * `{ error }` holding the 401/403 response to return from the route handler.
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<{ user: { id: string; role: UserRole; cxo: boolean }; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
