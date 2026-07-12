import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed Middleware to Proxy. Same mechanism, clearer name — and a
 * clearer warning attached to it: per the Next docs, Proxy is for *optimistic*
 * checks only, and "should not be used as a full session management or
 * authorization solution."
 *
 * So this file does exactly one cheap thing: does a session cookie EXIST? It
 * does not verify the signature, does not hit the database, and does not read
 * the user's role. Every one of those is done at the point of use — in
 * `requireUser()` / `assertRole()` (src/lib/rbac.ts), as close to the data as
 * possible. A forged cookie sails straight through this file and is rejected a
 * few milliseconds later by `jwtVerify`.
 *
 * The value here is purely UX: an anonymous visitor gets bounced to /login
 * without paying for a database round-trip and a wasted render.
 */

const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSessionCookie = request.cookies.has("assetflow_session");
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasSessionCookie && !isPublic) {
    const url = new URL("/login", request.url);
    // Remember where they were headed, so login can send them back.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, the API routes (they guard themselves), and anything
  // that looks like a static file.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
