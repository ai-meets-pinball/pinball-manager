"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  machineBesitzer,
  machineBesitzerZuordnung,
  machines,
} from "@/db/schema";
import { inviteMember } from "@/db/actions/invitations";
import { requireClubManager } from "@/lib/session";
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
