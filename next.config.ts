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
};

export default nextConfig;
