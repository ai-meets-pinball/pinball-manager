import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js liest .env.local automatisch; drizzle-kit läuft außerhalb von Next,
// darum laden wir es hier explizit (mit .env als Fallback).
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DATABASE_URL bevorzugt; POSTGRES_URL ist der Vercel-Supabase-Fallback.
    url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL!,
  },
});
