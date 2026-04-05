import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      designation: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    designation?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string;
    name?: string;
    username?: string;
    designation?: string;
  }
}
