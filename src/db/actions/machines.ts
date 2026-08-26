"use server";

import { and, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  machineAusstattung,
  machineBesitzer,
  machineBesitzerZuordnung,
  machineModels,
  machines,
  repairs,
  shares,
  user,
} from "@/db/schema";
import { parseOpdbRef } from "@/lib/opdb-ref";
import { darfMaschine } from "@/lib/rechte";
import {
  getClubRole,
  isClubMember,
  requireMachineAccess,
  requireMachineWrite,
  requireUser,
} from "@/lib/session";
import { uploadMachinePhoto } from "@/lib/storage";
import { machineSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Nur echte OPDB-Bild-URLs zulassen — der Wert kommt aus einem versteckten
  Formularfeld und landet ungefiltert als <img src>, darum hier begrenzen.
*/
function opdbImageUrl(formData: FormData): string | null {
  const raw = (formData.get("opdbImageUrl") as string | null)?.trim();
  return raw && raw.startsWith("https://img.opdb.org/") ? raw : null;
}

/* Hilfsfunktion: gemeinsame Validierung + optionale Club-Zuordnung prüfen. */
async function parseMachine(userId: string, formData: FormData) {
  const parsed = machineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const data = parsed.data;
  if (data.clubId && !(await isClubMember(userId, data.clubId))) {
    return { error: "Du bist kein Mitglied des gewählten Clubs" };
  }
  return { data };
}

/*
  Sorgt dafür, dass es zum OPDB-Bezug einen Eintrag im geteilten Modell-Katalog
  gibt, und liefert dessen id (oder null).

  Zwei bewusste Regeln:
  - Nur EDITIONS-Referenzen taugen als Modell. Eine reine Gruppen-Referenz
    (nur Titel) wird verworfen, weil sich Spulen-/Schaltermatrizen je Edition
    unterscheiden. Aliasse werden auf ihre Edition normalisiert.
  - `onConflictDoNothing`: der Katalog gehört niemandem. Wer eine Maschine später
    anlegt (und seine Instanzfelder frei editiert hat), darf die Katalogdaten
    aller anderen NICHT überschreiben — first writer wins.
*/
async function ensureMachineModel(
  data: {
    opdbRef?: string;
    hersteller: string;
    modell: string;
    baujahr?: number;
    ipdbRef?: string;
  },
  imageUrl: string | null,
): Promise<string | null> {
  const teile = parseOpdbRef(data.opdbRef);
  if (!teile?.machineRef) return null;

  await db
    .insert(machineModels)
    .values({
      opdbRef: teile.machineRef,
      opdbGroupRef: teile.groupRef,
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      ipdbRef: data.ipdbRef ?? null,
      imageUrl,
    })
    .onConflictDoNothing();

  const model = await db.query.machineModels.findFirst({
    where: eq(machineModels.opdbRef, teile.machineRef),
    columns: { id: true },
  });
  return model?.id ?? null;
}

/** Die Reparatur-Freigaben einer Maschine aufheben, wenn sich ihr Modell
    ändert — sonst hingen die Freigaben am alten Typ. Handbuch-Fakten sind seit
    dem Datenmodell-Redesign kein Share mehr (Modell-Wissen in `knowledge`) und
    bleiben bewusst am ursprünglichen Modell. */
async function widerrufeFreigaben(machineId: string) {
  const eigeneReparaturen = db
    .select({ id: repairs.id })
    .from(repairs)
    .where(eq(repairs.machineId, machineId));

  await db
    .delete(shares)
    .where(
      and(
        eq(shares.artefaktTyp, "repair"),
        inArray(shares.artefaktId, eigeneReparaturen),
      ),
    );
}

/*
  Einen Besitzer im Scope anlegen ODER den bereits vorhandenen namensgleichen
  Eintrag zurückgeben — RACE-FEST: legen zwei parallele Requests denselben Namen
  im selben Scope an (Doppelklick, zwei Tabs, zwei Club-Mitglieder gleichzeitig),
  sieht das vorherige SELECT nichts und der INSERT läuft in die partiellen
  Unique-Indizes (machine_besitzer_*_name_unique → Postgres 23505). Statt als 500
  durchzuschlagen, wird dann der vom Konkurrenten angelegte Eintrag nachgeladen.
*/
async function legeBesitzerAn(
  werte: {
    name: string;
    email?: string | null;
    userId?: string | null;
    clubId: string | null;
    createdBy: string;
  },
  scopeBedingung: SQL | undefined,
): Promise<string> {
  try {
    const [neu] = await db
      .insert(machineBesitzer)
      .values(werte)
      .returning({ id: machineBesitzer.id });
    return neu.id;
  } catch (e) {
    if ((e as { code?: string }).code !== "23505") throw e;
    // Konkurrent war schneller — seinen Eintrag im selben Scope nachladen.
    const [vorhanden] = await db
      .select({ id: machineBesitzer.id })
      .from(machineBesitzer)
      .where(
        and(
          scopeBedingung,
          sql`lower(${machineBesitzer.name}) = ${werte.name.toLowerCase()}`,
        ),
      )
      .limit(1);
    if (!vorhanden) throw e; // ein anderer Constraint — nicht verschlucken
    return vorhanden.id;
  }
}

/*
  Besitzer-Felder des Formulars auflösen — ein Gerät kann MEHRERE Besitzer
  haben. Drei Wege, beliebig kombinierbar:
  - besitzerIds: bestehende Katalog-Einträge (Scope-Prüfung je Eintrag),
  - besitzerUserIds: Plattform-Nutzer (der Besitzer ist oft schon Mitglied),
  - besitzerNeuName/-Email: neue Namen (Paare in DOM-Reihenfolge).
  Neues wird im Geltungsbereich der Maschine dedupliziert — gleicher Name
  (case-insensitiv) bzw. gleiches Konto → derselbe Eintrag, kein Duplikat;
  ein namensgleicher Eintrag ohne Konto wird beim Nutzer-Weg VERKNÜPFT statt
  dupliziert. Eine nachgereichte E-Mail füllt nur ein LEERES E-Mail-Feld
  (kein stilles Überschreiben). Nichts angegeben → leere Liste.
*/
async function besitzerAufloesen(
  userId: string,
  zielClubId: string | null,
  formData: FormData,
): Promise<{ besitzerIds: string[] } | { error: string }> {
  const gewaehlte = formData
    .getAll("besitzerIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const nutzerIds = formData
    .getAll("besitzerUserIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const neuNamen = formData.getAll("besitzerNeuName").map(String);
  const neuEmails = formData.getAll("besitzerNeuEmail").map(String);

  const scopeBedingung = zielClubId
    ? eq(machineBesitzer.clubId, zielClubId)
    : and(
        isNull(machineBesitzer.clubId),
        eq(machineBesitzer.createdBy, userId),
      );

  // Set statt Array: derselbe Besitzer über zwei Wege gewählt bleibt EINE Zuordnung.
  const ergebnis = new Set<string>();

  // 1) Bestehende Katalog-Einträge.
  for (const gewaehlt of gewaehlte) {
    const eintrag = await db.query.machineBesitzer.findFirst({
      where: eq(machineBesitzer.id, gewaehlt),
    });
    if (!eintrag) return { error: "Besitzer-Eintrag nicht gefunden." };
    // Der Eintrag muss zum GELTUNGSBEREICH DER MASCHINE gehören — nicht bloß zu
    // irgendeinem Scope, den der Nutzer sehen darf. Sonst ließe sich (per
    // handgebautem Request oder altem Chip) ein Besitzer aus einem anderen
    // Club/dem Privatbestand an diese Maschine hängen (Scope-Verwischung).
    const imScope = zielClubId
      ? eintrag.clubId === zielClubId
      : eintrag.clubId === null && eintrag.createdBy === userId;
    if (!imScope) {
      return { error: "Dieser Besitzer gehört nicht zu dieser Maschine." };
    }
    ergebnis.add(eintrag.id);
  }

  // 2) Plattform-Nutzer als Besitzer: nur wer zum Geltungsbereich gehört —
  // Club-Maschine → Mitglied dieses Clubs, private Maschine → man selbst
  // (kein Durchprobieren fremder Nutzer-IDs).
  for (const nutzerId of nutzerIds) {
    const erlaubt = zielClubId
      ? await isClubMember(nutzerId, zielClubId)
      : nutzerId === userId;
    if (!erlaubt) {
      return {
        error: "Dieser Nutzer gehört nicht zum Geltungsbereich der Maschine.",
      };
    }
    const zielNutzer = await db.query.user.findFirst({
      where: eq(user.id, nutzerId),
      columns: { id: true, name: true },
    });
    if (!zielNutzer) return { error: "Nutzer nicht gefunden." };

    const [mitKonto] = await db
      .select({ id: machineBesitzer.id })
      .from(machineBesitzer)
      .where(and(scopeBedingung, eq(machineBesitzer.userId, nutzerId)))
      .limit(1);
    if (mitKonto) {
      ergebnis.add(mitKonto.id);
      continue;
    }

    const [namensgleich] = await db
      .select()
      .from(machineBesitzer)
      .where(
        and(
          scopeBedingung,
          sql`lower(${machineBesitzer.name}) = ${zielNutzer.name.toLowerCase()}`,
        ),
      )
      .limit(1);
    if (namensgleich) {
      if (namensgleich.userId && namensgleich.userId !== nutzerId) {
        return {
          error:
            "Ein namensgleicher Besitzer ist bereits mit einem anderen Konto verknüpft.",
        };
      }
      if (!namensgleich.userId) {
        await db
          .update(machineBesitzer)
          .set({ userId: nutzerId })
          .where(eq(machineBesitzer.id, namensgleich.id));
      }
      ergebnis.add(namensgleich.id);
      continue;
    }

    // Bewusst OHNE E-Mail: für verknüpfte Konten braucht der Katalog keine —
    // und Mitglieder-Adressen gehören nicht in die Club-weit sichtbare Liste.
    ergebnis.add(
      await legeBesitzerAn(
        {
          name: zielNutzer.name,
          userId: nutzerId,
          clubId: zielClubId,
          createdBy: userId,
        },
        scopeBedingung,
      ),
    );
  }

  // 3) Neue Namen (+ optionale E-Mail), Paare in DOM-Reihenfolge.
  for (let i = 0; i < neuNamen.length; i++) {
    const name = neuNamen[i].trim();
    if (!name) continue;
    const email = (neuEmails[i] ?? "").trim().toLowerCase() || null;

    const [vorhanden] = await db
      .select()
      .from(machineBesitzer)
      .where(
        and(
          scopeBedingung,
          sql`lower(${machineBesitzer.name}) = ${name.toLowerCase()}`,
        ),
      )
      .limit(1);
    if (vorhanden) {
      if (email && !vorhanden.email) {
        await db
          .update(machineBesitzer)
          .set({ email })
          .where(eq(machineBesitzer.id, vorhanden.id));
      }
      ergebnis.add(vorhanden.id);
      continue;
    }

    ergebnis.add(
      await legeBesitzerAn(
        { name, email, clubId: zielClubId, createdBy: userId },
        scopeBedingung,
      ),
    );
  }

  return { besitzerIds: [...ergebnis] };
}

/** Die Besitzer-Zuordnungen einer Maschine auf die aufgelöste Liste setzen
    (ersetzt den kompletten Stand — die Liste IST die Wahrheit des Formulars). */
async function schreibeBesitzerZuordnung(
  machineId: string,
  besitzerIds: string[],
) {
  await db
    .delete(machineBesitzerZuordnung)
    .where(eq(machineBesitzerZuordnung.machineId, machineId));
  if (besitzerIds.length > 0) {
    await db
      .insert(machineBesitzerZuordnung)
      .values(besitzerIds.map((besitzerId) => ({ machineId, besitzerId })))
      .onConflictDoNothing();
  }
}

/* Ausstattung/Add-ons aus dem Formular: Name+Notiz-Paare in DOM-Reihenfolge
   (Hidden-Inputs ausstattungName / ausstattungNotiz). Leere Namen fallen weg,
   Längen werden geklemmt. Kein Katalog, keine Kategorie. */
function ausstattungAusFormular(
  formData: FormData,
): { name: string; notiz: string | null }[] {
  const namen = formData.getAll("ausstattungName").map(String);
  const notizen = formData.getAll("ausstattungNotiz").map(String);
  const out: { name: string; notiz: string | null }[] = [];
  for (let i = 0; i < namen.length; i++) {
    const name = namen[i].trim().slice(0, 120);
    if (!name) continue;
    const notiz = (notizen[i] ?? "").trim().slice(0, 300);
    out.push({ name, notiz: notiz ? notiz : null });
  }
  return out;
}

/** Die Ausstattung einer Maschine auf den Formular-Stand setzen (Formular =
    Wahrheit) — wie schreibeBesitzerZuordnung: alte Einträge weg, neue rein. */
async function schreibeAusstattung(
  machineId: string,
  eintraege: { name: string; notiz: string | null }[],
): Promise<void> {
  await db
    .delete(machineAusstattung)
    .where(eq(machineAusstattung.machineId, machineId));
  if (eintraege.length > 0) {
    await db
      .insert(machineAusstattung)
      .values(
        eintraege.map((e) => ({ machineId, name: e.name, notiz: e.notiz })),
      );
  }
}

export async function createMachine(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const result = await parseMachine(user.id, formData);
  if ("error" in result) return result;
  const data = result.data;

  // Eigenes Foto hat Vorrang; sonst das OPDB-Bild verwenden.
  const fotoUrl =
    (await uploadMachinePhoto(formData.get("foto") as File | null, user.id)) ??
    opdbImageUrl(formData);

  const modelId = await ensureMachineModel(data, opdbImageUrl(formData));

  const besitzer = await besitzerAufloesen(
    user.id,
    data.clubId ?? null,
    formData,
  );
  if ("error" in besitzer) return besitzer;

  const [created] = await db
    .insert(machines)
    .values({
      ownerId: user.id,
      clubId: data.clubId ?? null,
      modelId,
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      opdbRef: data.opdbRef ?? null,
      ipdbRef: data.ipdbRef ?? null,
      fotoUrl,
    })
    .returning({ id: machines.id });

  await schreibeBesitzerZuordnung(created.id, besitzer.besitzerIds);
  await schreibeAusstattung(created.id, ausstattungAusFormular(formData));

  revalidatePath("/machines");
  redirect(`/machines/${created.id}`);
}

export async function updateMachine(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id"));
  // Schreib-Gate: lehnt reine Lesezugriffe ab.
  const { user, machine, darf } = await requireMachineWrite(id);

  const result = await parseMachine(user.id, formData);
  if ("error" in result) return result;
  const data = result.data;

  /*
    Die Club-Zuordnung darf NUR ändern, wer die Maschine auch löschen dürfte
    (Eigentümer, Club-Manager, Super-Admin).

    Vorher genügte Bearbeitungsrecht — und das hat jedes Club-Mitglied. Ein
    einfaches Mitglied konnte eine fremde Maschine samt Fehlern, Reparaturen
    und Handbuch-Fakten in einen eigenen Club verschieben oder sie aus dem
    bisherigen Club herauslösen. Für alle anderen bleibt die Zuordnung stehen.
  */
  const clubId = darf.loeschen ? (data.clubId ?? null) : machine.clubId;

  // Eigenes Foto hat Vorrang; sonst ein neu gewähltes OPDB-Bild.
  const neuesFoto =
    (await uploadMachinePhoto(formData.get("foto") as File | null, user.id)) ??
    opdbImageUrl(formData);

  /*
    Wechselt das Modell, werden bestehende Freigaben dieser Maschine
    WIDERRUFEN. Sonst blieben sie am alten Typ hängen und andere Besitzer
    bekämen die Daten eines ganz anderen Automaten als passende Referenz
    angezeigt — bei Spulen- und Schaltermatrizen ist das kein Schönheitsfehler.
  */
  const neuerModelId = await ensureMachineModel(data, opdbImageUrl(formData));
  if (neuerModelId !== machine.modelId) {
    await widerrufeFreigaben(id);
  }

  const besitzer = await besitzerAufloesen(user.id, clubId, formData);
  if ("error" in besitzer) return besitzer;

  await db
    .update(machines)
    .set({
      clubId,
      modelId: neuerModelId,
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      opdbRef: data.opdbRef ?? null,
      ipdbRef: data.ipdbRef ?? null,
      // Foto nur ersetzen, wenn ein neues hochgeladen oder aus OPDB gewählt wurde.
      ...(neuesFoto ? { fotoUrl: neuesFoto } : {}),
    })
    .where(eq(machines.id, id));

  await schreibeBesitzerZuordnung(id, besitzer.besitzerIds);
  await schreibeAusstattung(id, ausstattungAusFormular(formData));

  revalidatePath("/machines");
  revalidatePath(`/machines/${id}`);
  redirect(`/machines/${id}`);
}

export type BulkAssignState = {
  error?: string;
  anzahl?: number;
  uebersprungen?: number;
};

/*
  Mehrere Maschinen auf einmal einem Club zuweisen (oder aus dem Club lösen,
  clubId = null). Spiegelt die Einzel-Regeln aus updateMachine:
  - Ziel-Club: nur ein Club, in dem der Nutzer Mitglied ist (isClubMember).
  - Je Maschine: die Zuordnung darf nur ändern, wer die Maschine auch löschen
    dürfte (Eigentümer, Club-Manager des bisherigen Clubs, Super-Admin). Nicht
    erlaubte Maschinen werden übersprungen und in `uebersprungen` gezählt.
*/
export async function assignMachinesToClub(
  _prev: BulkAssignState,
  formData: FormData,
): Promise<BulkAssignState> {
  const user = await requireUser();

  const raw = String(formData.get("clubId") ?? "");
  // "none" = aus dem Club entfernen; leerer Wert wird vom required-Select verhindert.
  const clubId = raw === "" || raw === "none" ? null : raw;

  const ids = formData.getAll("machineIds").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Keine Maschinen ausgewählt." };

  if (clubId && !(await isClubMember(user.id, clubId))) {
    return { error: "Du bist kein Mitglied des gewählten Clubs." };
  }

  const selected = await db.query.machines.findMany({
    where: inArray(machines.id, ids),
    columns: { id: true, ownerId: true, clubId: true },
  });

  const erlaubt: string[] = [];
  for (const m of selected) {
    // Umhängen ist so einschneidend wie Löschen — dieselbe Regel, eine Quelle.
    const rolle = m.clubId ? await getClubRole(user.id, m.clubId) : null;
    if (darfMaschine(user, m, rolle).loeschen) erlaubt.push(m.id);
  }

  if (erlaubt.length > 0) {
    await db
      .update(machines)
      .set({ clubId })
      .where(inArray(machines.id, erlaubt));
    revalidatePath("/machines");
  }

  return {
    anzahl: erlaubt.length,
    uebersprungen: selected.length - erlaubt.length,
  };
}

export async function deleteMachine(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  // `darf` entscheidet das bereits — die Regel steht in lib/rechte.ts und wird
  // hier nicht ein zweites Mal nachgebaut.
  const { darf } = await requireMachineAccess(id);
  if (!darf.loeschen) {
    throw new Error("Nur Eigentümer oder Club-Owner/-Admin dürfen löschen");
  }

  await db.delete(machines).where(eq(machines.id, id));
  revalidatePath("/machines");
  redirect("/machines");
}

/*
  Mehrere Maschinen auf einmal löschen. Spiegelt die Einzel-Regel aus
  deleteMachine je Maschine (darfMaschine(...).loeschen — Eigentümer, Club-
  Owner/-Admin, Super-Admin); nicht erlaubte werden übersprungen und gezählt.
  Das Löschen kaskadiert (Fehler, Reparaturen, Wartungen …) wie beim Einzelfall.
*/
export async function deleteMachines(
  _prev: BulkAssignState,
  formData: FormData,
): Promise<BulkAssignState> {
  const user = await requireUser();

  const ids = formData.getAll("machineIds").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Keine Maschinen ausgewählt." };

  const selected = await db.query.machines.findMany({
    where: inArray(machines.id, ids),
    columns: { id: true, ownerId: true, clubId: true },
  });

  const erlaubt: string[] = [];
  for (const m of selected) {
    const rolle = m.clubId ? await getClubRole(user.id, m.clubId) : null;
    if (darfMaschine(user, m, rolle).loeschen) erlaubt.push(m.id);
  }

  if (erlaubt.length > 0) {
    await db.delete(machines).where(inArray(machines.id, erlaubt));
    revalidatePath("/machines");
  }

  return {
    anzahl: erlaubt.length,
    uebersprungen: selected.length - erlaubt.length,
  };
}
