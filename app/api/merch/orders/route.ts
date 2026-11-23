import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-api";
import { getShopDb } from "@/lib/shopDb";

export async function GET() {
  const { error } = await requireRole("admin", "member");
  if (error) return error;

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
