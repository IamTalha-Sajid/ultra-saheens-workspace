import { Schema, models, model, type Types } from "mongoose";

export interface CommitteeUploadDoc {
  userId: Types.ObjectId;
  title: string;
  details: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommitteeUploadSchema = new Schema<CommitteeUploadDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    details: { type: String, default: "", maxlength: 2000 },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { collection: "committee_uploads", timestamps: true }
);

CommitteeUploadSchema.index({ createdAt: -1 });

const CommitteeUpload =
  models.CommitteeUpload ?? model<CommitteeUploadDoc>("CommitteeUpload", CommitteeUploadSchema);

export default CommitteeUpload;
