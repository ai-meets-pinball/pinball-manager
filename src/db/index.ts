import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
  Eine einzige Drizzle-Instanz für die gesamte App — geteilt von den Server Actions
  und vom Better-Auth-Drizzle-Adapter (siehe src/lib/auth.ts).

  `prepare: false` ist für den Supabase-Connection-Pooler (PgBouncer im Transaction-Mode)
  nötig, der keine Prepared Statements unterstützt.

  DATABASE_URL ist unser bevorzugter Name; POSTGRES_URL ist der Fallback, den die
  Vercel-Supabase-Integration automatisch setzt (gepoolte Verbindung, Port 6543).
*/
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL!;
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
