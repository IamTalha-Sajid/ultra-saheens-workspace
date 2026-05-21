import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-api";
import { getShopDb } from "@/lib/shopDb";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getShopDb();
  const orders = await db
    .collection("orders")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    orders: orders.map((o) => ({ ...o, _id: String(o._id) })),
  });
}
