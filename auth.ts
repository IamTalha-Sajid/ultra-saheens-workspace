import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { isAllowedEmail } from "@/lib/domain";
import User from "@/models/User";

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
        const email = emailRaw.toLowerCase().trim();
        if (!isAllowedEmail(email)) return null;

        await connectDB();
        const user = await User.findOne({ email }).lean();
        if (!user?.passwordHash) return null;

        const valid = await compare(passwordRaw, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name ?? "",
          username: user.username ?? "",
          designation: user.designation ?? "",
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
        token.email = user.email ?? undefined;
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
      }
      return session;
    },
  },
});
