import { cookies } from "next/headers";
import { ALLOWED_DOMAIN, isAllowedEmail } from "@/lib/domain";

export type Board = "executive" | "team";

// CXOs: company-domain emails, plus these usernames (people outside the domain).
const CXO_USERNAMES = ["muhammad_hassaan"];

export function isCxo(user: { email?: string | null; username?: string | null }): boolean {
  if (user.email && isAllowedEmail(user.email)) return true;
  return !!user.username && CXO_USERNAMES.includes(user.username.trim().toLowerCase());
}

export const BOARD_COOKIE = "board";

/**
 * Board a request acts on: everyone but CXOs is always "team"; CXOs use the
 * board chosen in the sidebar switcher (cookie), defaulting to executive.
 */
export async function resolveBoard(cxo: boolean): Promise<Board> {
  if (!cxo) return "team";
  return (await cookies()).get(BOARD_COOKIE)?.value === "team" ? "team" : "executive";
}

export function boardLabel(board: Board): string {
  return board === "team" ? "Team" : "Executive";
}

/** Mongo filter matching only non-CXO users (what non-CXO callers may see, assign or mention). */
export const NON_CXO_USER_FILTER = {
  email: { $not: new RegExp(`@${ALLOWED_DOMAIN.replace(/\./g, "\\.")}$`, "i") },
  username: { $nin: CXO_USERNAMES },
};

/** Mongo filter for a board; records saved before boards existed count as executive. */
export function boardFilter(board: Board): { board: Board } | { board: { $ne: "team" } } {
  return board === "team" ? { board: "team" } : { board: { $ne: "team" } };
}

/** Whether a record's board (missing = executive) is visible to the caller. */
export function canAccessBoard(cxo: boolean, recordBoard?: string | null): boolean {
  return cxo || recordBoard === "team";
}
