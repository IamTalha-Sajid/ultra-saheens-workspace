import { Schema, models, model, type Types } from "mongoose";

const DEFAULT_DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export interface PageDoc {
  userId: Types.ObjectId;
  title: string;
  /** Single emoji (or ZWJ sequence), shown beside title — not part of title text. */
  icon: string;
  parentId: Types.ObjectId | null;
  order: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<PageDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled" },
    icon: { type: String, default: "", maxlength: 32 },
    parentId: { type: Schema.Types.ObjectId, ref: "Page", default: null, index: true },
    order: { type: Number, default: 0 },
    content: { type: String, default: DEFAULT_DOC },
  },
  { collection: "pages", timestamps: true }
);

PageSchema.index({ userId: 1, parentId: 1, order: 1 });

const Page = models.Page ?? model<PageDoc>("Page", PageSchema);

export default Page;
