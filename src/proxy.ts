import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/*
  Next-16-"Proxy" (früher Middleware). Zwei Aufgaben:

  1) Optimistischer Redirect für geschützte Pfade — NUR ein früher Wegweiser für
     Unangemeldete, KEINE Sicherheitsgrenze. Die echte Autorisierung machen die
     require*-Helfer in lib/session.ts (RSC + Server Actions).

  2) Eine nonce-basierte Content-Security-Policy als Defense-in-Depth gegen XSS
     (schützt u. a. das ephemere API-Key-Feld, siehe components/ui/api-key-field).
     Skripte laufen nur mit gültiger Nonce (+ strict-dynamic) — eingeschleuste
     Fremd-Skripte nicht. Next liest die Nonce aus dem Request-Header und setzt
     sie automatisch auf seine eigenen <script>-Tags.
*/

// Nur diese Präfixe lösen den Login-Redirect aus (wie bisher).
const PROTECTED = ["/machines", "/clubs", "/account", "/admin"];

/*
  Ausrollen: zuerst true = nur MELDEN (Content-Security-Policy-Report-Only),
  nichts wird blockiert. In der Browser-Konsole auf Verstöße prüfen; ist alles
  sauber, auf false stellen → CSP wird scharf geschaltet (blockiert).
*/
const CSP_REPORT_ONLY = true;

function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    `default-src 'self'`,
    // Dev: Turbopack/React-Refresh braucht 'unsafe-eval'. Prod bleibt streng.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline-Styles: Next + React style={{…}} (z. B. die farbcodierten Chips).
    `style-src 'self' 'unsafe-inline'`,
    // Bilder: Supabase-Storage (Fotos) + OPDB + data: (Favicons u. Ä.).
    `img-src 'self' data: https://*.supabase.co https://img.opdb.org`,
    `font-src 'self'`, // next/font/google wird selbst gehostet
    `connect-src 'self'${dev ? " ws:" : ""}`, // Dev: HMR-WebSocket
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const responseHeader = CSP_REPORT_ONLY
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

  const { pathname } = request.nextUrl;
  if (
    PROTECTED.some((p) => pathname.startsWith(p)) &&
    !getSessionCookie(request)
  ) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.headers.set(responseHeader, csp);
    return res;
  }

  // Die Nonce im (immer scharf benannten) Request-Header übergeben, damit Next
  // sie extrahiert und auf seine Skripte setzt. `x-nonce` steht zusätzlich für
  // eigene <script nonce>-Fälle bereit.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set(responseHeader, csp);
  return res;
}

export const config = {
  matcher: [
    // Alle Seiten außer API-Routen, Next-Interna und statischen Bild-Assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
