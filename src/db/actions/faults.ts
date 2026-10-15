"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { faultImages, faults, machines } from "@/db/schema";
import { isClubMember, requireMachineWrite } from "@/lib/session";
import { mitStatusNachzug } from "@/db/machine-status-core";
import { benachrichtigeUeberNeuenFehler } from "@/db/whatsapp-benachrichtigung";
import { maileEigentuemerUeberNeuenFehler } from "@/db/fehler-mail-benachrichtigung";
import { uebernehmeUploads } from "@/lib/storage";
import { faultEditSchema, faultSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

export async function createFault(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  // Autorisierung erbt sich von der Maschine.
  const { user } = await requireMachineWrite(machineId);

  const parsed = faultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  // Fotos liegen schon im Speicher (Direkt-Upload aus dem Browser); hier
  // ZUERST prüfen (eigener Ordner, echte Bytes) — schlägt es fehl, wird gar
  // kein Fehler angelegt.
  let urls: string[];
  try {
    urls = await uebernehmeUploads("fehlerfoto", user.id, formData.getAll("bildUrl"));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const [neu] = await mitStatusNachzug(machineId, (tx) =>
    tx
      .insert(faults)
      .values({
        machineId,
        beschreibung: parsed.data.beschreibung,
        kategorie: parsed.data.kategorie ?? null,
        prioritaet: parsed.data.prioritaet,
        status: parsed.data.status,
        gemeldetVon: user.id,
      })
      .returning({ id: faults.id }),
  );
  if (urls.length > 0) {
    await db
      .insert(faultImages)
      .values(urls.map((url) => ({ faultId: neu.id, url })));
  }

  // Best-effort: Opt-in-Owner/Admins des Clubs per WhatsApp informieren. Darf die
  // Meldung nie zurückrollen (deshalb try/catch, vor dem redirect).
  try {
    await benachrichtigeUeberNeuenFehler({
      id: neu.id,
      machineId,
      beschreibung: parsed.data.beschreibung,
      status: parsed.data.status,
    });
  } catch (e) {
    console.error("[whatsapp] Benachrichtigung fehlgeschlagen:", e);
  }
  // Private Maschine: Eigentümer per Mail, wenn jemand anderes meldet
  // (Regel + Sperre in lib/fehler-mail.ts). Nur offene Fehler.
  if (parsed.data.status === "offen") {
    try {
      await maileEigentuemerUeberNeuenFehler({
        id: neu.id,
        machineId,
        beschreibung: parsed.data.beschreibung,
        melderId: user.id,
        melderName: user.name,
      });
    } catch (e) {
      console.error("[fehler-mail] Benachrichtigung fehlgeschlagen:", e);
    }
  }

  revalidatePath(`/machines/${machineId}`);
  // „Speichern & nächster Fehler": zurück ins leere Formular; die id im Query
  // gibt dem Formular einen neuen Schlüssel (frischer Zustand, keine alten Fotos).
  if (formData.get("weiter")) {
    redirect(`/machines/${machineId}/faults/new?gespeichert=${neu.id}`);
  }
  redirect(`/machines/${machineId}`);
}

/*
  Melder aus dem Bearbeiten-Formular: "gast" + Name, oder ein Nutzer, der zum
  Geltungsbereich der Maschine gehört (Club-Maschine → Mitglied, private →
  der Eigentümer; kein Durchprobieren fremder IDs — dieselbe Regel wie beim
  Besitzer-Picker). Ohne Feld bleibt der Melder, wie er ist.
*/
async function melderAusFormular(
  machineId: string,
  gemeldetVon: string | undefined,
  gemeldetVonName: string | undefined,
): Promise<
  | { werte: { gemeldetVon: string | null; gemeldetVonName: string | null } | Record<never, never> }
  | { error: string }
> {
  if (!gemeldetVon) return { werte: {} };
  if (gemeldetVon === "gast") {
    return {
      werte: { gemeldetVon: null, gemeldetVonName: gemeldetVonName?.trim() || "Gast" },
    };
  }
  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
    columns: { clubId: true, ownerId: true },
  });
  if (!machine) return { error: "Maschine nicht gefunden." };
  const erlaubt = machine.clubId
    ? await isClubMember(gemeldetVon, machine.clubId)
    : gemeldetVon === machine.ownerId;
  if (!erlaubt) {
    return { error: "Dieser Nutzer gehört nicht zum Geltungsbereich der Maschine." };
  }
  return { werte: { gemeldetVon, gemeldetVonName: null } };
}

export async function updateFault(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const parsed = faultEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const melder = await melderAusFormular(
    machineId,
    parsed.data.gemeldetVon,
    parsed.data.gemeldetVonName,
  );
  if ("error" in melder) return { error: melder.error };

  await mitStatusNachzug(machineId, (tx) =>
    tx
      .update(faults)
      .set({
        beschreibung: parsed.data.beschreibung,
        kategorie: parsed.data.kategorie ?? null,
        prioritaet: parsed.data.prioritaet,
        status: parsed.data.status,
        ...melder.werte,
      })
      .where(and(eq(faults.id, id), eq(faults.machineId, machineId))),
  );

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function deleteFault(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  await mitStatusNachzug(machineId, (tx) =>
    tx
      .delete(faults)
      .where(and(eq(faults.id, id), eq(faults.machineId, machineId))),
  );

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
