"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Dünner Client-Wrapper um next-themes, damit das Root-Layout (Server Component)
 * den Provider einbinden kann. Das aktuelle Editorial-Design ist hell als Default
 * mit einer warmen Dunkelvariante — layout.tsx setzt `defaultTheme="light"`, der
 * ThemeToggle in der Nav schaltet um.
 */

/*
  Warum der console.error-Filter?
  next-themes rendert intern ein Inline-<script>, das das gewählte Theme VOR dem
  ersten Paint setzt und so das Aufblitzen des falschen Themes verhindert. Das ist
  gewollt und läuft serverseitig korrekt. React 19.2 gibt im DEV-Modus dennoch die
  Warnung „Encountered a script tag while rendering React component" aus, weil ein
  Inline-<script> beim reinen Client-Render nicht ausgeführt würde — für unser
  SSR-Script ein Fehlalarm. next-themes wird seit März 2025 nicht mehr gepflegt,
  eine Korrektur dort ist unwahrscheinlich. Deshalb blenden wir GENAU diese eine
  Meldung aus (nur im Dev-Build, nur im Browser) und lassen jede andere
  Konsolenausgabe unberührt. In Produktion wird der Block wegoptimiert.
  Siehe https://github.com/pacocoursey/next-themes/issues/387
*/
type PatchbareKonsole = typeof console & { __nativeError?: typeof console.error };

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  const konsole = console as PatchbareKonsole;
  // Idempotent: auf das Original zurückgreifen, falls das Modul (z. B. per HMR)
  // erneut ausgewertet wird — nie den bereits gefilterten Wrapper einwickeln.
  const nativeError = konsole.__nativeError ?? konsole.error;
  konsole.__nativeError = nativeError;
  konsole.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    nativeError(...(args as Parameters<typeof console.error>));
  };
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
