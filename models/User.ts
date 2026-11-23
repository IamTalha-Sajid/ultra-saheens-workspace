import { Schema, models, model } from "mongoose";

export const USER_ROLES = ["admin", "member", "director"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserDoc {
  /** Optional: directors sign in with a username and have no company email. */
  email?: string;
  /** Access level (separate from `designation`, which is the job title). */
  role?: UserRole;
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
    // Uniqueness is enforced by a partial index (see scripts/migrate-roles.ts)
    // so several email-less users can coexist.
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: { type: String, enum: USER_ROLES, default: "member" },
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

UserSchema.index(
  { email: 1 },
  {
    name: "email_partial_unique",
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  }
);

const User = models.User ?? model<UserDoc>("User", UserSchema);

export default User;
