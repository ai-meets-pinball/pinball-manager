"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Umschalter zwischen Light- und Dark-Mode. Das Orange bleibt in beiden Modi
 * die Markenfarbe. Rendert erst nach dem Mount das echte Icon (Hydration).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Standard-Hydration-Guard von next-themes: erst nach dem Mount das echte Icon.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Theme umschalten"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-fg)] transition-colors hover:bg-[var(--color-overlay)]"
    >
      {mounted && isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
