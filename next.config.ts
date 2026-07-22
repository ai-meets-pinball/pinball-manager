import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Handbuch-PDFs kommen als FormData an die Server Action (siehe
    // src/lib/manual-extract.ts). Das Default-Limit (1 MB) ist zu klein;
    // ~16 MB deckt typische Handbücher ab (die In-Memory-Extraktion deckelt bei 15 MB).
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
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
