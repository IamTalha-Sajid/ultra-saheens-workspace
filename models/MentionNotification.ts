import { Schema, models, model, type Types } from "mongoose";

export interface MentionNotificationDoc {
  recipientId: Types.ObjectId;
  actorId: Types.ObjectId;
  pageId?: Types.ObjectId;
  pageTitle: string;
  mentionLabel: string;
  actorName: string;
  read: boolean;
  type: "mention" | "ticket_assigned" | "ticket_comment";
  ticketId?: Types.ObjectId;
  createdAt: Date;
}

const MentionNotificationSchema = new Schema<MentionNotificationDoc>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pageId: { type: Schema.Types.ObjectId, ref: "Page" },
    pageTitle: { type: String, default: "" },
    mentionLabel: { type: String, default: "" },
    actorName: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
    type: { type: String, enum: ["mention", "ticket_assigned", "ticket_comment"], default: "mention" },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "mention_notifications" }
);

MentionNotificationSchema.index({ recipientId: 1, createdAt: -1 });

const MentionNotification =
  models.MentionNotification ??
  model<MentionNotificationDoc>("MentionNotification", MentionNotificationSchema);

export default MentionNotification;
