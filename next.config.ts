import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Handbuch-PDFs kommen als FormData an die Server Action (siehe
    // src/lib/manual-extract.ts). Das Default-Limit (1 MB) ist viel zu klein;
    // Handbücher können bis ~50 MB groß sein (die In-Memory-Extraktion deckelt
    // bei 50 MB). Etwas Luft für Multipart-Overhead → 52 MB.
    serverActions: {
      bodySizeLimit: "52mb",
    },
    // WICHTIG: Weil src/proxy.ts (Middleware) auf diesen Routen läuft, kappt Next
    // den Request-Body zusätzlich am Proxy — Default nur 10 MB. Größere Handbücher
    // würden dort abgeschnitten und scheitern kryptisch mit „Unexpected end of
    // form" (der Multipart-Parser sieht die Schluss-Boundary nie), BEVOR die
    // Größenprüfung der Action greift. Auf dieselbe Grenze wie oben anheben.
    proxyClientMaxBodySize: "52mb",
  },
  // Der lokale Ollama-Pfad (AI_PROVIDER=ollama, src/lib/ai/prepare-pdf.ts) nutzt
  // unpdf + das native @napi-rs/canvas zum Rendern gescannter Seiten. Native
  // Bindings lassen sich nicht ins Bundle packen — zur Laufzeit aus node_modules
  // laden. (Cloud/Vercel nutzt Claude und rührt diesen Pfad nie an.)
  serverExternalPackages: ["@napi-rs/canvas", "unpdf"],
  // Ergänzende Sicherheits-Header (statisch, für alle Routen). Die
  // Content-Security-Policy selbst wird pro Request in src/proxy.ts gesetzt
  // (braucht eine Nonce). Hier nur, was ohne Nonce global gilt.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
