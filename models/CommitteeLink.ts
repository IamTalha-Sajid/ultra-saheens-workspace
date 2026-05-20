import { Schema, models, model, type Types } from "mongoose";

export interface CommitteeLinkDoc {
  userId: Types.ObjectId;
  folderId: Types.ObjectId | null;
  title: string;
  url: string;
  description: string;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommitteeLinkSchema = new Schema<CommitteeLinkDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: "CommitteeFolder", default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    department: { type: String, default: "", trim: true, maxlength: 100 },
  },
  { collection: "committee_links", timestamps: true }
);

CommitteeLinkSchema.index({ createdAt: -1 });

const CommitteeLink =
  models.CommitteeLink ?? model<CommitteeLinkDoc>("CommitteeLink", CommitteeLinkSchema);

export default CommitteeLink;
