"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  clubs,
  emailTemplates,
  faultImages,
  faults,
  feedback,
  invitations,
  knowledge,
  knowledgeRevisions,
  machineBesitzer,
  machineDokumente,
  machines,
  maintenanceLog,
  promptOverrides,
  termine,
  user,
  userSettings,
} from "@/db/schema";
import { countClubOwners, requireUser } from "@/lib/session";
import { getUserClubs } from "@/db/queries";
import { SUPER_ADMIN_EMAILS } from "@/lib/super-admins";
import { deleteStorageObject } from "@/lib/storage";
import type { FormState } from "@/db/actions/form-state";

/*
  Konto-Löschung (DSGVO Art. 17), Self-Service. Sicher gestaltet: zerstört NIE
  fremde/geteilte Daten und hinterlässt keine verwaisten Fremdschlüssel.

  Ablauf: bestätigen (E-Mail tippen) → Guards (alleiniger Club-Owner / kein
  Übertragungsziel → blocken) → Storage der eigenen Medien leeren → in EINER
  Transaktion: private Maschinen löschen (Cascade), erstellte/geteilte Inhalte an
  einen Fallback-Super-Admin übertragen, Beiträge zu FREMDEN Maschinen
  anonymisieren (SET NULL), dann den Nutzer löschen (cascadet Auth + persönliche
  Tabellen). Danach ist die Session ungültig → zurück auf die Startseite.
*/
export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();

  const bestaetigung = String(formData.get("bestaetigung") ?? "")
    .trim()
    .toLowerCase();
  if (bestaetigung !== me.email.toLowerCase()) {
    return { error: "Zur Bestätigung bitte deine E-Mail-Adresse exakt eingeben." };
  }

  // Guard 1: alleiniger Owner eines Clubs → blocken (sonst bliebe ein Club ohne
  // Owner zurück). Der Nutzer muss vorher übertragen oder den Club löschen.
  const meineClubs = await getUserClubs(me.id);
  const alleinOwner: string[] = [];
  for (const c of meineClubs) {
    if (c.rolle === "owner" && (await countClubOwners(c.id)) <= 1) {
      alleinOwner.push(c.name);
    }
  }
  if (alleinOwner.length > 0) {
    return {
      error: `Du bist alleiniger Owner von: ${alleinOwner.join(
        ", ",
      )}. Übertrage die Ownerschaft an ein anderes Mitglied oder lösche diese Clubs zuerst — danach lässt sich dein Konto löschen.`,
    };
  }

  // Fallback-Super-Admin: Ziel, an das erstellte/geteilte Inhalte übertragen
  // werden (Autorschaft bleibt sauber, Inhalt geht nicht verloren).
  let fallbackId: string | null = null;
  if (SUPER_ADMIN_EMAILS.length > 0) {
    const kandidat = await db
      .select({ id: user.id })
      .from(user)
      .where(and(inArray(user.email, SUPER_ADMIN_EMAILS), ne(user.id, me.id)))
      .limit(1);
    fallbackId = kandidat[0]?.id ?? null;
  }
  // Guard 2: kein Übertragungsziel (z. B. der einzige Super-Admin/Betreiber).
  if (!fallbackId) {
    return {
      error:
        "Konto-Löschung aktuell nicht möglich (kein Ziel zum Übertragen erstellter/geteilter Inhalte). Bitte wende dich an den Betreiber.",
    };
  }

  // ── Storage-Objekte einsammeln, VOR dem DB-Löschen (Cascade räumt kein
  //    Supabase-Storage; sonst Waisen). ──
  const meineMaschinen = await db
    .select({ id: machines.id, fotoUrl: machines.fotoUrl })
    .from(machines)
    .where(and(eq(machines.ownerId, me.id), isNull(machines.clubId)));
  const privatIds = meineMaschinen.map((m) => m.id);

  const urls: (string | null)[] = [];
  const meRow = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, me.id));
  urls.push(meRow[0]?.image ?? null);
  const settings = await db
    .select({ logoUrl: userSettings.logoUrl })
    .from(userSettings)
    .where(eq(userSettings.userId, me.id));
  urls.push(...settings.map((s) => s.logoUrl));
  urls.push(...meineMaschinen.map((m) => m.fotoUrl));
  if (privatIds.length > 0) {
    const bilder = await db
      .select({ url: faultImages.url })
      .from(faultImages)
      .innerJoin(faults, eq(faultImages.faultId, faults.id))
      .where(inArray(faults.machineId, privatIds));
    urls.push(...bilder.map((b) => b.url));
    const docs = await db
      .select({ url: machineDokumente.url })
      .from(machineDokumente)
      .where(
        and(
          inArray(machineDokumente.machineId, privatIds),
          eq(machineDokumente.typ, "datei"),
        ),
      );
    urls.push(...docs.map((d) => d.url));
  }
  const screens = await db
    .select({ url: feedback.screenshotUrl })
    .from(feedback)
    .where(eq(feedback.createdBy, me.id));
  urls.push(...screens.map((s) => s.url));

  // Best-effort (nicht Teil der DB-Transaktion; deleteStorageObject schluckt Fehler).
  for (const u of urls) await deleteStorageObject(u);

  // ── DB in EINER Transaktion. ──
  await db.transaction(async (tx) => {
    // 1. Private Maschinen (Cascade: Fehler/Bilder/Reparaturen/Wartung/Termine/
    //    Dokumente/Ausstattung/Besitzer-Zuordnung/maschinenbezogenes Wissen).
    if (privatIds.length > 0) {
      await tx.delete(machines).where(inArray(machines.id, privatIds));
    }

    // 2. Harte Blocker (NOT NULL, kein Cascade): Autorschaft an den Fallback
    //    übertragen — Inhalt bleibt erhalten. Übrige eigene Maschinen sind jetzt
    //    Club-Maschinen (ownerId), die dem Club erhalten bleiben.
    await tx
      .update(machines)
      .set({ ownerId: fallbackId })
      .where(eq(machines.ownerId, me.id));
    await tx
      .update(clubs)
      .set({ createdBy: fallbackId })
      .where(eq(clubs.createdBy, me.id));
    await tx
      .update(machineBesitzer)
      .set({ createdBy: fallbackId })
      .where(eq(machineBesitzer.createdBy, me.id));
    await tx
      .update(knowledge)
      .set({ createdBy: fallbackId })
      .where(eq(knowledge.createdBy, me.id));
    await tx
      .update(knowledgeRevisions)
      .set({ editedBy: fallbackId })
      .where(eq(knowledgeRevisions.editedBy, me.id));
    await tx
      .update(invitations)
      .set({ invitedBy: fallbackId })
      .where(eq(invitations.invitedBy, me.id));

    // 3. Weiche Blocker (nullable): Beiträge zu FREMDEN Maschinen anonymisieren.
    await tx
      .update(machines)
      .set({ statusVon: null })
      .where(eq(machines.statusVon, me.id));
    await tx
      .update(faults)
      .set({ gemeldetVon: null })
      .where(eq(faults.gemeldetVon, me.id));
    await tx
      .update(maintenanceLog)
      .set({ erledigtVon: null })
      .where(eq(maintenanceLog.erledigtVon, me.id));
    await tx
      .update(termine)
      .set({ createdBy: null })
      .where(eq(termine.createdBy, me.id));
    await tx
      .update(machineDokumente)
      .set({ createdBy: null })
      .where(eq(machineDokumente.createdBy, me.id));
    await tx
      .update(emailTemplates)
      .set({ updatedBy: null })
      .where(eq(emailTemplates.updatedBy, me.id));
    await tx
      .update(promptOverrides)
      .set({ updatedBy: null })
      .where(eq(promptOverrides.updatedBy, me.id));

    // 4. Nutzer löschen → Cascade: session/account (Better Auth) + roleAssignments,
    //    shares/shareTargets, userSettings, knowledgeSignals/Overrides, feedback,
    //    whatsappOptin, maintenancePlans(→items). Danach ist die Session ungültig.
    await tx.delete(user).where(eq(user.id, me.id));
  });

  redirect("/");
}
