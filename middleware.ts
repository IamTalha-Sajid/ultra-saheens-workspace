import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge-safe route guard: do not import `@/auth` here — that pulls Mongoose/bcrypt
 * (Node "stream") into the Edge bundle and breaks Next.js proxy/middleware.
 */
export async function middleware(request: NextRequest) {
  const secureCookie = request.nextUrl.protocol === "https:";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  if (request.nextUrl.pathname.startsWith("/app") && !token) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
