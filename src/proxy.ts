import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/*
  Next-16-"Proxy" (früher Middleware): NUR ein optimistischer Redirect.
  Prüft, ob überhaupt ein Session-Cookie vorhanden ist, um Unangemeldete früh wegzuleiten.
  Das ist NICHT die Sicherheitsgrenze — die echte Autorisierung machen die
  require*-Helfer in lib/session.ts (RSC + Server Actions).
*/
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/machines/:path*",
    "/clubs/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
