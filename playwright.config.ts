import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

/*
  E2E-Tests laufen gegen eine EIGENE Datenbank (E2E_DATABASE_URL) und einen
  eigenen Port, damit weder die echten Daten noch der Dev-Server auf 3100
  angefasst werden.

  Kein Auth-Bypass: die Testkonten werden über den regulären Einladungs- und
  Sign-up-Pfad angelegt (siehe e2e/helpers/seed.ts) und melden sich über den
  echten Login-Endpunkt an. Die Tests durchlaufen damit exakt die Auth- und
  Rechtelogik, die auch in Produktion greift.
*/
config({ path: [".env.e2e", ".env.local", ".env"] });

const E2E_PORT = Number(process.env.E2E_PORT ?? 3101);
export const BASE_URL = `http://localhost:${E2E_PORT}`;

if (!process.env.E2E_DATABASE_URL) {
  throw new Error(
    "E2E_DATABASE_URL fehlt. Die Tests brauchen eine EIGENE Datenbank — " +
      "niemals die produktive. Siehe .env.example.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  // Serielle Ausführung: die Suite teilt sich einen Datenbestand.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `next dev -p ${E2E_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Der App-Prozess sieht NUR die Test-Datenbank (db/index.ts bevorzugt
      // DATABASE_URL vor POSTGRES_URL).
      DATABASE_URL: process.env.E2E_DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-secret-nur-lokal",
      // Bootstrap-Konto der Suite; alles andere läuft über Einladungen.
      SUPER_ADMIN_EMAILS: "e2e-admin@e2e.local",
      // Kein echter Mailversand in Tests.
      RESEND_API_KEY: "",
    },
  },
});
