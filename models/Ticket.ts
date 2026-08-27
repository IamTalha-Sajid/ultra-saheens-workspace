import { Schema, models, model, Document, Types } from "mongoose";

export interface TicketDoc extends Document {
    sid: number;
    title: string;
    description: string;
    status: "Todo" | "In progress" | "Blocked" | "Done";
    priority: "Highest" | "High" | "Medium" | "Low" | "Lowest";
    type: "Task" | "Bug" | "Story" | "Epic";
    labels: string[];
    estimate: string;
    assigneeId?: Types.ObjectId;
    assigneeIds: Types.ObjectId[];
    creatorId: Types.ObjectId;
    archived: boolean;
    archivedAt?: Date;
    doneAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TicketSchema = new Schema<TicketDoc>(
    {
        sid: { type: Number, required: true, index: true },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        status: {
            type: String,
            enum: ["Todo", "In progress", "Blocked", "Done"],
            default: "Todo",
        },
        priority: {
            type: String,
            enum: ["Highest", "High", "Medium", "Low", "Lowest"],
            default: "Medium",
        },
        type: {
            type: String,
            enum: ["Task", "Bug", "Story", "Epic"],
            default: "Task",
        },
        labels: { type: [String], default: [] },
        estimate: { type: String, default: "" },
        assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
        assigneeIds: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
        creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        archived: { type: Boolean, default: false },
        archivedAt: { type: Date },
        doneAt: { type: Date },
    },
    { timestamps: true }
);

TicketSchema.index({ archivedAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

const Ticket = models.Ticket ?? model<TicketDoc>("Ticket", TicketSchema);

export default Ticket;
