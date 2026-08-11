import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/*
  Unit-Tests für die REINEN Regeln (Fälligkeit, Betriebsstatus, Rechte, Parser).
  Bewusst eng gefasst: nur Dateien unter src/ mit der Endung `.test.ts`. Die
  Playwright-Suite unter e2e/
  benutzt dieselbe `.spec.ts`-Endung und darf hier NICHT mitlaufen — sie braucht
  Browser, Server und Test-DB (siehe CLAUDE.md).
*/
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
