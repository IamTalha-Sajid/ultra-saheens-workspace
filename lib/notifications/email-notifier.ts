import { sendEmail } from "@/lib/email";
import User from "@/models/User";
import mongoose from "mongoose";

type NotificationType = "ticket_assigned" | "ticket_comment" | "mention";

interface NotifierParams {
    recipientId: mongoose.Types.ObjectId;
    actorName: string;
    ticketTitle: string;
    ticketId?: mongoose.Types.ObjectId | string;
    pageId?: mongoose.Types.ObjectId | string;
    type: NotificationType;
}

export async function sendEmailNotification({
    recipientId,
    actorName,
    ticketTitle,
    ticketId,
    pageId,
    type
}: NotifierParams) {
    try {
        console.log(`[EmailNotifier] Processing ${type} notification for recipientId: ${recipientId}`);
        const recipient = await User.findById(recipientId).select("email name").lean();
        
        if (!recipient) {
            console.warn(`[EmailNotifier] Recipient not found: ${recipientId}`);
            return;
        }
        if (!recipient.email) {
            console.warn(`[EmailNotifier] Recipient has no email: ${recipient.name || recipientId}`);
            return;
        }

        console.log(`[EmailNotifier] Sending to: ${recipient.email}`);
        const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
        let actionLink = `${baseUrl}/app/board`;
        
        if (ticketId) {
            actionLink = `${baseUrl}/app/board?ticketId=${ticketId}`;
        } else if (pageId) {
            actionLink = `${baseUrl}/app?page=${pageId}`;
        }

        let subject = "";
        let actionText = "";

        switch (type) {
            case "ticket_assigned":
                subject = `[Ultra Shaheens] Task Assigned: ${ticketTitle}`;
                actionText = `assigned you to the ticket: <b>${ticketTitle}</b>`;
                break;
            case "ticket_comment":
                subject = `[Ultra Shaheens] Mentioned in Comment: ${ticketTitle}`;
                actionText = `mentioned you in a comment on: <b>${ticketTitle}</b>`;
                break;
            case "mention":
                subject = `[Ultra Shaheens] Mentioned in ${ticketTitle}`;
                actionText = `mentioned you in: <b>${ticketTitle}</b>`;
                break;
        }

        const html = `
            <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded-xl: 12px; color: #1f2937;">
                <div style="margin-bottom: 24px;">
                    <h2 style="color: #7c3aed; margin: 0; font-size: 24px; font-weight: 800;">Ultra Shaheens</h2>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    Hi ${recipient.name || 'there'},<br><br>
                    <strong>${actorName}</strong> ${actionText}.
                </p>

                <div style="margin-bottom: 32px;">
                    <a href="${actionLink}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        View in Workspace
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
                
                <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
                    You received this because you are part of the Ultra Shaheens Workspace.<br>
                    Please do not reply directly to this email.
                </p>
            </div>
        `;

        await sendEmail({
            to: recipient.email,
            subject,
            html,
            text: `${actorName} ${actionText.replace(/<b>|<\/b>/g, '')}. View at: ${actionLink}`,
        });

        console.log(`[EmailNotifier] Success: Email sent to ${recipient.email}`);

    } catch (error) {
        console.error("[EmailNotifier] Error:", error);
    }
}
