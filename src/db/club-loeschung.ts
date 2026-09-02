import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clubs, machines } from "@/db/schema";

/*
  Das Wie des Club-Löschens — gemeinsam für den Owner (actions/clubs.ts) und den
  Super-Admin (actions/admin.ts). Kein "use server": der Guard (wer darf) liegt
  in den Actions. Maschinen werden nicht gelöscht, sondern entkoppelt (bleiben
  beim Eigentümer); Rollenzuweisungen und Einladungen fallen per ON DELETE CASCADE.
*/
export async function loescheClub(clubId: string): Promise<void> {
  await db.update(machines).set({ clubId: null }).where(eq(machines.clubId, clubId));
  await db.delete(clubs).where(eq(clubs.id, clubId));
}
