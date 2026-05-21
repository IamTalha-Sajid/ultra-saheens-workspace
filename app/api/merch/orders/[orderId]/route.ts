import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-api";
import { getShopDb } from "@/lib/shopDb";
import { sendEmail } from "@/lib/email";

const VALID_STATUSES = ["pending", "processing", "dispatched", "cancelled"];

function buildCancellationEmail(orderId: string, customerName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Order ${orderId} Cancelled — Ultra Shaheens</title>
</head>
<body style="margin:0;padding:0;background-color:#030b14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030b14;padding:40px 0;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Header -->
  <tr><td align="center" style="padding-bottom:32px;">
    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#1a0a0a;border:1px solid #3b0a0a;border-radius:16px;padding:18px 32px;text-align:center;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#6b7280;">ULTRA SHAHEENS OFFICIAL SHOP</p>
        <p style="margin:8px 0 0;font-size:26px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:#ef4444;">Order Cancelled</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Order ID + Status -->
  <tr><td style="background:#0d1a26;border:1px solid #1e2e3d;border-radius:16px;padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Order ID</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#ffffff;font-family:monospace,monospace;">${orderId}</p>
        </td>
        <td style="vertical-align:middle;text-align:right;">
          <span style="display:inline-block;background:#ef444418;color:#ef4444;border:1px solid #ef444444;border-radius:999px;padding:5px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Cancelled</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:20px;"></td></tr>

  <!-- Message -->
  <tr><td style="background:#0d1a26;border:1px solid #1e2e3d;border-radius:16px;padding:24px;">
    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#fff;">Hi ${customerName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Unfortunately your order <strong style="color:#fff;font-family:monospace,monospace;">${orderId}</strong> has been cancelled.
    </p>
    <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.7;">
      If you believe this is a mistake or would like more information, please contact our team — we're happy to help.
    </p>
  </td></tr>
  <tr><td style="height:20px;"></td></tr>

  <!-- Contact admin note -->
  <tr><td style="background:#1c1408;border:1px solid #78350f;border-radius:16px;padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#f59e0b;">Need Help?</p>
    <p style="margin:0;font-size:13px;color:#d1d5db;line-height:1.6;">
      Please contact our admin for further details regarding your cancellation. We'll look into it and get back to you as soon as possible.
    </p>
    <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;">
      Reach us at: <strong style="color:#fff;">ultrashaheens@gmail.com</strong>
    </p>
  </td></tr>
  <tr><td style="height:20px;"></td></tr>

  <!-- Track order -->
  <tr><td style="background:#0d1a26;border:1px solid #1e2e3d;border-radius:16px;padding:24px;text-align:center;">
    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">You can verify your order status anytime using</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:900;color:#ffffff;font-family:monospace,monospace;">${orderId}</p>
    <a href="https://shop.ultrashaheens.com/order-status?id=${orderId}" style="display:inline-block;background:#374151;color:#d1d5db;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:12px 28px;border-radius:10px;text-decoration:none;">Check Order Status</a>
  </td></tr>
  <tr><td style="height:32px;"></td></tr>

  <!-- Footer -->
  <tr><td style="text-align:center;padding-bottom:40px;">
    <p style="margin:0 0 4px;font-size:12px;color:#374151;font-weight:600;">Ultra Shaheens Official Shop</p>
    <p style="margin:0;font-size:11px;color:#1f2937;">shop.ultrashaheens.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const body = await req.json() as { status?: string };

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = await getShopDb();

  const order = await db.collection("orders").findOne({ orderId });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await db.collection("orders").updateOne(
    { orderId },
    { $set: { status: body.status, updatedAt: new Date() } }
  );

  // Send cancellation email if status changed to cancelled
  if (body.status === "cancelled" && order.customer?.email) {
    sendEmail({
      to: order.customer.email as string,
      subject: `Your Ultra Shaheens order ${orderId} has been cancelled`,
      html: buildCancellationEmail(orderId, order.customer.name as string),
    }).catch((err) => console.error("Cancellation email failed:", err));
  }

  return NextResponse.json({ success: true, status: body.status });
}
