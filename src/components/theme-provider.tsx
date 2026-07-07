"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Dünner Client-Wrapper um next-themes, damit das Root-Layout (Server Component)
 * den Provider einbinden kann. Das Arcade-Design (Handoff) ist dunkel-only —
 * layout.tsx setzt forcedTheme="dark".
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
