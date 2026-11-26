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

const CXO_EMAIL_RX = new RegExp(`@${ALLOWED_DOMAIN.replace(/\./g, "\\.")}$`, "i");

const CXO_USER_FILTER = { $or: [{ email: CXO_EMAIL_RX }, { username: { $in: CXO_USERNAMES } }] };
const NON_CXO_USER_FILTER = { email: { $not: CXO_EMAIL_RX }, username: { $nin: CXO_USERNAMES } };

/**
 * Mongo filter for the users who belong on a board (lists, pickers, assignees).
 * Executive: CXOs only. Team: non-CXOs only, except CXO viewers see everyone.
 */
export function usersForBoard(board: Board, cxoViewer: boolean) {
  if (board === "executive") return CXO_USER_FILTER;
  return cxoViewer ? {} : NON_CXO_USER_FILTER;
}

/** Mongo filter for a board; records saved before boards existed count as executive. */
export function boardFilter(board: Board): { board: Board } | { board: { $ne: "team" } } {
  return board === "team" ? { board: "team" } : { board: { $ne: "team" } };
}

/** Whether a record's board (missing = executive) is visible to the caller. */
export function canAccessBoard(cxo: boolean, recordBoard?: string | null): boolean {
  return cxo || recordBoard === "team";
}
