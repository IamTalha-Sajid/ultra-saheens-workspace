import { Schema, models, model, Document, Types } from "mongoose";

export interface TicketCommentDoc extends Document {
    ticketId: Types.ObjectId;
    authorId: Types.ObjectId;
    content: string; // Could be HTML from Tiptap or markdown
    createdAt: Date;
    updatedAt: Date;
}

const TicketCommentSchema = new Schema<TicketCommentDoc>(
    {
        ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
    },
    { timestamps: true }
);

TicketCommentSchema.index({ ticketId: 1 });

const TicketComment =
    models.TicketComment ?? model<TicketCommentDoc>("TicketComment", TicketCommentSchema);

export default TicketComment;
