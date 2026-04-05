import { Schema, models, model } from "mongoose";

export interface UserDoc {
  email: string;
  name: string;
  /** Unique handle for @mentions / notifications (lowercase). */
  username?: string;
  passwordHash: string;
  /** User's job title or role. */
  designation?: string;
  createdAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, default: "", trim: true },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      maxlength: 32,
    },
    designation: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

const User = models.User ?? model<UserDoc>("User", UserSchema);

export default User;
