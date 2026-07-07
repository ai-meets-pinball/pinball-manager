import type { Metadata } from "next";
import { Bungee, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

/*
  Arcade-Schriften (Claude-Design-Handoff):
  - Bungee       → Display/Überschriften
  - Space Grotesk → Fließtext
  - Space Mono   → Labels / technische Kürzel
*/
const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

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
    "Reparatur- und Verwaltungsdatenbank für Flipperautomaten — Maschinen, Fehler und Reparaturen verwalten.",
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
      className={`${bungee.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body>
        {/*
          Dunkles Arcade-Theme als Default (erster Eindruck), aber umschaltbar auf
          Light über den ThemeToggle in der Nav. Orange bleibt in beiden Modi.
        */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
