import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

/*
  Schriften (Claude-Design-Handoff v2):
  - Space Grotesk → Überschriften (700) + Fließtext
  - Space Mono   → Labels / Kennzahlen / technische Kürzel
*/
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Pinball Manager",
  description:
    "Verwaltungssoftware für Flipperautomaten — Stammdaten, Standorte, Fehler und Reparaturen jeder Maschine an einem Ort.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body>
        {/*
          Helles editorial Theme als Default, umschaltbar auf eine warme
          Dunkelvariante über den ThemeToggle in der Nav.
        */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
