import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { isAllowedEmail } from "@/lib/domain";
import User, { type UserRole } from "@/models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;
        if (
          typeof emailRaw !== "string" ||
          typeof passwordRaw !== "string" ||
          !emailRaw ||
          !passwordRaw
        ) {
          return null;
        }
        // The "email" field accepts either an email address or a username
        // (directors have no company email and sign in with a username).
        const identifier = emailRaw.toLowerCase().trim();
        const byEmail = identifier.includes("@");
        if (byEmail && !isAllowedEmail(identifier)) return null;

        await connectDB();
        const user = await User.findOne(
          byEmail ? { email: identifier } : { username: identifier }
        ).lean();
        if (!user?.passwordHash) return null;

        const valid = await compare(passwordRaw, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user._id),
          email: user.email ?? "",
          name: user.name ?? "",
          username: user.username ?? "",
          designation: user.designation ?? "",
          role: user.role ?? "member",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.email && !isAllowedEmail(user.email)) return false;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email || undefined;
        token.role = (user as { role?: UserRole }).role ?? "member";
        token.name = user.name ?? "";
        token.username = (user as { username?: string }).username ?? "";
        token.designation = (user as { designation?: string }).designation ?? "";
      }
      if (trigger === "update" && session && typeof session === "object") {
        const s = session as { name?: string; email?: string; username?: string; designation?: string };
        if (typeof s.name === "string") token.name = s.name;
        if (typeof s.email === "string") token.email = s.email;
        if (typeof s.username === "string") token.username = s.username;
        if (typeof s.designation === "string") token.designation = s.designation;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        session.user.username = (token.username as string) ?? "";
        session.user.designation = (token.designation as string) ?? "";
        session.user.role = token.role ?? "member";
      }
      return session;
    },
  },
});
