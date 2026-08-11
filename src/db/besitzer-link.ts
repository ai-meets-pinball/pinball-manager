import { and, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { machineBesitzer } from "@/db/schema";

/*
  Besitzer-Einträge mit einem Plattform-Konto verknüpfen, sobald es eines gibt:
  beim Annehmen einer Einladung bzw. bei der Registrierung über den
  Einladungslink. Rein informativ (vergibt keine Rechte) — deshalb dürfen alle
  Einträge mit dieser E-Mail verknüpft werden, auch club-übergreifend. Bereits
  verknüpfte Einträge bleiben unangetastet.

  Bewusst KEIN "use server"-Modul: die Funktion nimmt (userId, email) und darf
  darum nie als direkt aufrufbare Server Action exponiert sein.
*/
export async function verknuepfeBesitzerMitKonto(
  userId: string,
  email: string,
): Promise<void> {
  await db
    .update(machineBesitzer)
    .set({ userId })
    .where(
      and(
        isNull(machineBesitzer.userId),
        sql`lower(${machineBesitzer.email}) = ${email.toLowerCase()}`,
      ),
    );
}
