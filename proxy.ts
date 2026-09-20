import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Optimistic route protection only.
 *
 * This runs on every request including prefetches, so it reads the session
 * cookie and nothing else - no database. The real authorization checks live in
 * lib/dal.ts, next to the data. See the Next.js authentication guide:
 * "Proxy should not be your only line of defense".
 *
 * Renamed from `middleware.ts` in Next.js 16; the runtime is always Node.js.
 */

const PUBLIC_ROUTES = ["/", "/login", "/register"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuthenticated = Boolean(token?.id);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", request.nextUrl);
    // Preserve where they were heading so login can send them back.
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
