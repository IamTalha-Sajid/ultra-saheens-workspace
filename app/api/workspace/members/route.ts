import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth-api";
import { boardFilter, resolveBoard, usersForBoard } from "@/lib/board";
import User from "@/models/User";
import Ticket from "@/models/Ticket";

export async function GET() {
    const { user: caller, error } = await requireRole("admin", "member");
    if (error) return error;

    await connectDB();

    const board = await resolveBoard(caller.cxo);
    const users = await User.find(
        usersForBoard(board, caller.cxo),
        "name email username createdAt designation role"
    ).lean();
    const scope = boardFilter(board);

    const usersWithStats = await Promise.all(users.map(async (user) => {
        const assigneeFilter = { $or: [{ assigneeIds: user._id }, { assigneeId: user._id }], ...scope };
        const ticketCount = await Ticket.countDocuments({ ...assigneeFilter, archived: false });
        const doneCount = await Ticket.countDocuments({ ...assigneeFilter, status: "Done", archived: false });

        return {
            ...user,
            _id: String(user._id),
            stats: {
                assigned: ticketCount,
                completed: doneCount
            }
        };
    }));

    return NextResponse.json({ members: usersWithStats });
}
