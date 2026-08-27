"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ICON } from "@/components/ui/icon";

/**
 * Umschalter zwischen Light- und Dark-Mode. Der burgunderrote Akzent bleibt in
 * beiden Modi die Markenfarbe. Rendert erst nach dem Mount das echte Icon
 * (Hydration). Nutzt die gemeinsame IconButton-Chrome.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Standard-Hydration-Guard von next-themes: erst nach dem Mount das echte Icon.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <IconButton
      type="button"
      aria-label="Theme umschalten"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun size={ICON.md} /> : <Moon size={ICON.md} />}
    </IconButton>
  );
}
