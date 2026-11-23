import type { Types } from "mongoose";

type LeanUser = {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  username?: string;
};

export function userToJson(u: LeanUser, opts?: { hideEmail?: boolean }) {
  return {
    _id: String(u._id),
    name: u.name ?? "",
    email: opts?.hideEmail ? "" : (u.email ?? ""),
    username: u.username,
  };
}
