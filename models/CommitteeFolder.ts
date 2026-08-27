import { Schema, models, model, type Types } from "mongoose";

export interface CommitteeFolderDoc {
  name: string;
  type: "file" | "link";
  parentId: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommitteeFolderSchema = new Schema<CommitteeFolderDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    type: { type: String, enum: ["file", "link"], required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "CommitteeFolder", default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "committee_folders", timestamps: true }
);

CommitteeFolderSchema.index({ type: 1, parentId: 1, name: 1 });

const CommitteeFolder =
  models.CommitteeFolder ?? model<CommitteeFolderDoc>("CommitteeFolder", CommitteeFolderSchema);

export default CommitteeFolder;
