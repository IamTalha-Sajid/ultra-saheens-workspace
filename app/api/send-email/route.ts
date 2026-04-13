import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getSessionUserId } from "@/lib/auth-api";

/**
 * Example payload:
 * {
 *   "to": "recipient@example.com",
 *   "subject": "Hello from Ultra Shaheens",
 *   "body": "This is a test email"
 * }
 */
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, body } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields (to, subject, body)" },
        { status: 400 }
      );
    }

    await sendEmail({
      to,
      subject,
      text: body,
      html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #8b5cf6;">Ultra Shaheens</h2>
              <p>${body}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">Sent from Ultra Shaheens Workspace</p>
            </div>`,
    });

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("API Email Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
