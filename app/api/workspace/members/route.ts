import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/auth-api";
import User from "@/models/User";
import Ticket from "@/models/Ticket";

export async function GET() {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const users = await User.find({}, "name email username createdAt designation").lean();

    const usersWithStats = await Promise.all(users.map(async (user) => {
        const ticketCount = await Ticket.countDocuments({ assigneeId: user._id, archived: false });
        const doneCount = await Ticket.countDocuments({ assigneeId: user._id, status: "Done", archived: false });

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
