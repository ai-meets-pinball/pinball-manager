"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  machineBesitzer,
  machineBesitzerZuordnung,
  machines,
} from "@/db/schema";
import { inviteMember } from "@/db/actions/invitations";
import {
  BESITZER_NAME_MAX,
  besitzerLoeschenGesperrt,
  zusammengefuehrt,
} from "@/lib/besitzer";
import { isClubMember, requireClubManager } from "@/lib/session";
import type { FormState } from "@/db/actions/form-state";

/*
  EINEN der eingetragenen Besitzer einer Club-Maschine in den Club einladen
  (ein Gerät kann mehrere Besitzer haben — besitzerId benennt, wen).

  Dünner Umweg über inviteMember: dort liegen Rechte (requireClubManager),
  Duplikat-Regeln und der E-Mail-Versand — hier wird nur der Besitzer-Eintrag
  in die Formularfelder der bestehenden Einladung übersetzt (Rolle: member).
  Plattform-Einladungen ohne Club bleiben bewusst Sache der Super-Admins.
*/
export async function inviteBesitzer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId") ?? "");
  const besitzerId = String(formData.get("besitzerId") ?? "");

  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
    columns: { clubId: true, modell: true },
  });
  if (!machine?.clubId) {
    return { error: "Nur Besitzer von Club-Maschinen lassen sich einladen." };
  }

  // Rechte-Gate ZUERST — vor jedem weiteren Lookup: sonst verrieten die
  // folgenden, unterscheidbaren Fehlermeldungen einem Nicht-Manager die
  // Existenz/den Zustand fremder Maschinen und Besitzer (OWASP A01). Wirft für
  // Nicht-Owner/-Admin (dieselbe Prüfung, die inviteMember unten erneut macht).
  await requireClubManager(machine.clubId);

  // Der Besitzer muss wirklich AN DIESER Maschine eingetragen sein.
  const [zuordnung] = await db
    .select({ id: machineBesitzerZuordnung.id })
    .from(machineBesitzerZuordnung)
    .where(
      and(
        eq(machineBesitzerZuordnung.machineId, machineId),
        eq(machineBesitzerZuordnung.besitzerId, besitzerId),
      ),
    )
    .limit(1);
  if (!zuordnung) return { error: "Kein Besitzer dieser Maschine." };

  const besitzer = await db.query.machineBesitzer.findFirst({
    where: eq(machineBesitzer.id, besitzerId),
  });
  if (!besitzer?.email) {
    return { error: "Für diesen Besitzer ist keine E-Mail hinterlegt." };
  }
  if (besitzer.userId) {
    return { error: "Dieser Besitzer hat bereits ein Konto." };
  }

  const einladung = new FormData();
  einladung.set("clubId", machine.clubId);
  einladung.set("email", besitzer.email);
  einladung.set("rolle", "member");
  einladung.set(
    "message",
    `Du bist als Besitzer der Maschine „${machine.modell}" eingetragen.`,
  );
  const res = await inviteMember({}, einladung);

  revalidatePath(`/machines/${machineId}`);
  return res;
}

/*
  Besitzer-Katalog eines Clubs verwalten (Club-Seite, nur Owner/Admin):
  umbenennen, mit einem Mitglied verknüpfen, Dubletten zusammenführen, unbenutzte
  löschen. Vorher gab es keinen Schreibpfad — ein Tippfehler blieb für immer
  und die Korrektur erzeugte die nächste Zeile (Feedback 09/2026). Die
  Entscheidungen (was beim Zusammenführen gewinnt, wann Löschen gesperrt ist)
  stehen in lib/besitzer.ts; hier wird geladen und geschrieben.
  Rechte-Gate ZUERST, dann Scope-Check: der Eintrag muss zu DIESEM Club gehören.
*/
async function eintragImClub(clubId: string, besitzerId: string) {
  return db.query.machineBesitzer.findFirst({
    where: and(eq(machineBesitzer.id, besitzerId), eq(machineBesitzer.clubId, clubId)),
  });
}

/** Umbenennen / Konto verknüpfen — oder, wenn „zusammenfuehrenMit" gesetzt ist,
    diesen Eintrag in den anderen aufgehen lassen. EIN Dialog, eine Action. */
export async function updateBesitzer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clubId = String(formData.get("clubId") ?? "");
  const besitzerId = String(formData.get("besitzerId") ?? "");
  await requireClubManager(clubId);

  const eintrag = await eintragImClub(clubId, besitzerId);
  if (!eintrag) return { error: "Besitzer-Eintrag nicht gefunden." };

  const zielId = String(formData.get("zusammenfuehrenMit") ?? "").trim();
  if (zielId) return zusammenfuehren(clubId, eintrag, zielId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name ist erforderlich." };
  if (name.length > BESITZER_NAME_MAX) {
    return { error: `Name zu lang (maximal ${BESITZER_NAME_MAX} Zeichen).` };
  }
  const userId = String(formData.get("userId") ?? "").trim() || null;
  if (userId) {
    if (!(await isClubMember(userId, clubId))) {
      return { error: "Dieses Konto ist kein Mitglied des Clubs." };
    }
    const andere = await db.query.machineBesitzer.findFirst({
      where: and(
        eq(machineBesitzer.clubId, clubId),
        eq(machineBesitzer.userId, userId),
        ne(machineBesitzer.id, besitzerId),
      ),
    });
    if (andere) {
      return {
        error: `Das Konto ist schon mit „${andere.name}“ verknüpft — führe die beiden Einträge zusammen.`,
      };
    }
  }

  try {
    await db
      .update(machineBesitzer)
      .set({ name, userId })
      .where(eq(machineBesitzer.id, besitzerId));
  } catch (e) {
    // Unique-Index auf lower(name) je Club: der Name existiert schon.
    if ((e as { code?: string }).code === "23505") {
      return { error: "Diesen Namen gibt es im Club schon — führe die Einträge zusammen." };
    }
    throw e;
  }

  revalidatePath(`/clubs/${clubId}`);
  return { ok: true };
}

async function zusammenfuehren(
  clubId: string,
  quelle: { id: string; email: string | null; userId: string | null },
  zielId: string,
): Promise<FormState> {
  const ziel = await eintragImClub(clubId, zielId);
  if (!ziel || ziel.id === quelle.id) return { error: "Ziel-Eintrag nicht gefunden." };
  const felder = zusammengefuehrt(ziel, quelle);
  if ("error" in felder) return { error: felder.error };

  await db.transaction(async (tx) => {
    // Die Maschinen der Quelle wandern zum Ziel (schon vorhandene Zuordnungen
    // bleiben einfach, Unique-Constraint); dann verschwindet die Quelle —
    // CASCADE räumt ihre restlichen Zuordnungen.
    const zuordnungen = await tx
      .select({ machineId: machineBesitzerZuordnung.machineId })
      .from(machineBesitzerZuordnung)
      .where(eq(machineBesitzerZuordnung.besitzerId, quelle.id));
    if (zuordnungen.length > 0) {
      await tx
        .insert(machineBesitzerZuordnung)
        .values(zuordnungen.map((z) => ({ machineId: z.machineId, besitzerId: ziel.id })))
        .onConflictDoNothing();
    }
    await tx.update(machineBesitzer).set(felder).where(eq(machineBesitzer.id, ziel.id));
    await tx.delete(machineBesitzer).where(eq(machineBesitzer.id, quelle.id));
  });

  revalidatePath(`/clubs/${clubId}`);
  return { ok: true };
}

/** Löschen — nur ohne Maschinen (die Oberfläche graut den Knopf mit Grund aus;
    hier gilt dieselbe Regel, damit ein handgebauter Request nicht durchkommt). */
export async function deleteBesitzer(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  const besitzerId = String(formData.get("besitzerId") ?? "");
  await requireClubManager(clubId);
  const eintrag = await eintragImClub(clubId, besitzerId);
  if (!eintrag) return;
  const zuordnungen = await db
    .select({ id: machineBesitzerZuordnung.id })
    .from(machineBesitzerZuordnung)
    .where(eq(machineBesitzerZuordnung.besitzerId, besitzerId));
  const sperre = besitzerLoeschenGesperrt(zuordnungen.length);
  if (sperre) throw new Error(sperre);
  await db.delete(machineBesitzer).where(eq(machineBesitzer.id, besitzerId));
  revalidatePath(`/clubs/${clubId}`);
}
