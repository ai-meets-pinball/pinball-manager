import type { NextConfig } from "next";
import { withRedlining } from "redlining/next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions mit Datei: nur noch das Club-/Druck-Logo (bis 4 MB, geht
    // bewusst durchs Formular, damit ein SVG geprüft ist, bevor es öffentlich
    // wird — lib/storage.ts). Fotos/Dokumente laden direkt nach Vercel Blob,
    // Handbuch-PDFs an eine API-Route (lib/handbuch-route.ts) — beide laufen
    // weder durch eine Server Action noch durch den Proxy. Default wäre 1 MB.
    // Das Proxy-Limit (Default 10 MB) liegt darüber und bleibt unangetastet.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Der lokale Ollama-Pfad (AI_PROVIDER=ollama, src/lib/ai/prepare-pdf.ts) nutzt
  // unpdf + das native @napi-rs/canvas zum Rendern gescannter Seiten. Native
  // Bindings lassen sich nicht ins Bundle packen — zur Laufzeit aus node_modules
  // laden. (Cloud/Vercel nutzt Claude und rührt diesen Pfad nie an.)
  serverExternalPackages: ["@napi-rs/canvas", "unpdf"],
  // Alte Route: die Modell-Seiten hießen früher /typen („Gerätetypen") — alte
  // Deep-Links sollen weiter funktionieren.
  async redirects() {
    return [
      { source: "/typen", destination: "/modelle", permanent: true },
      { source: "/typen/:id", destination: "/modelle/:id", permanent: true },
      // Die „Nutzung"-Seite (/preise) wurde entfernt — alte Links landen auf Start.
      { source: "/preise", destination: "/", permanent: true },
    ];
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

// Redlining: Entwicklungs-Overlay (Alt+R) zum Annotieren der laufenden App.
// Der Loader läuft NUR im Dev-Server; der Production-Build bleibt unberührt.
export default withRedlining(nextConfig);
