import type { Types } from "mongoose";

type LeanUser = {
  _id: Types.ObjectId;
  name?: string;
  email: string;
  username?: string;
};

export function userToJson(u: LeanUser) {
  return {
    _id: String(u._id),
    name: u.name ?? "",
    email: u.email,
    username: u.username,
  };
}
