import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
  Eine einzige Drizzle-Instanz für die gesamte App — geteilt von den Server Actions
  und vom Better-Auth-Drizzle-Adapter (siehe src/lib/auth.ts).

  `prepare: false` ist für den Supabase-Connection-Pooler (PgBouncer im Transaction-Mode)
  nötig, der keine Prepared Statements unterstützt.
*/
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, { schema });
