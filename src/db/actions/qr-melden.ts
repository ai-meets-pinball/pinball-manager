"use server";

import { and, count, eq, gte, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { faultImages, faults } from "@/db/schema";
import { mitStatusNachzug } from "@/db/machine-status-core";
import { benachrichtigeUeberNeuenFehler } from "@/db/whatsapp-benachrichtigung";
import { getMachineByQrToken, getSammlungByToken } from "@/db/queries";
import { getCurrentUser } from "@/lib/session";
import { MAX_FAULT_IMAGES, uploadFaultImages } from "@/lib/storage";
import type { FormState } from "@/db/actions/form-state";

/*
  Missbrauchsbremse für GAST-Meldungen: Der QR-Aufkleber sitzt öffentlich am
  Gerät — wer ihn sieht, kennt den Token. Ein Skript könnte damit die
  Fehlerliste fluten.

  Bewusst wird NICHT die GESAMTZAHL gedeckelt (ein öffentlicher Club darf viele
  echte Melder haben — das wäre die falsche Grenze), sondern nur:
  1. die RATE je Maschine in einem kurzen Zeitfenster (ein Skript feuert schnell,
     echte Menschen selten mehr als ein paar Meldungen in Minuten), und
  2. exakte DUPLIKATE (dieselbe offene Beschreibung nochmal) — die werden
     freundlich als „schon gemeldet" quittiert, ohne eine zweite Zeile anzulegen.
  Angemeldete Nutzer (mit Konto) sind von beidem nicht betroffen.
*/
const GAST_FENSTER_MS = 10 * 60_000; // 10 Minuten
const GAST_MAX_IM_FENSTER = 8;

async function gastMeldungenImFenster(machineId: string): Promise<number> {
  const seit = new Date(Date.now() - GAST_FENSTER_MS);
  const [row] = await db
    .select({ n: count() })
    .from(faults)
    .where(
      and(
        eq(faults.machineId, machineId),
        isNotNull(faults.gemeldetVonName),
        gte(faults.datum, seit),
      ),
    );
  return Number(row?.n ?? 0);
}

/** Liegt derselbe Fehler (exakt gleiche Beschreibung) als Gast-Meldung schon
    offen vor? Dann keine zweite Zeile anlegen. */
async function gastDuplikat(
  machineId: string,
  beschreibung: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: faults.id })
    .from(faults)
    .where(
      and(
        eq(faults.machineId, machineId),
        isNotNull(faults.gemeldetVonName),
        ne(faults.status, "behoben"),
        eq(faults.beschreibung, beschreibung),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/*
  Fehler melden über den QR-Code der Maschine — die EINZIGE Schreib-Aktion, die
  ohne Maschinen-Zugriffsrecht funktioniert. Die Berechtigung ist der Besitz
  des Tokens (wer vor dem Gerät steht, darf melden):
  - Angemeldete Nutzer melden unter ihrem Konto (gemeldetVon).
  - Gäste geben nur einen Namen an (gemeldetVonName; Anzeige „… (Gast)").
  Bewusst OHNE Prioritäts-/Statuswahl: Gäste beschreiben das Symptom, die
  Einordnung (Triage) bleibt beim Betreiber — auch damit ein Scherzbold nicht
  per „kritisch" den Betriebsstatus der Maschine kippen kann.
*/
// Kurzer Melde-Code (12 Hex-Zeichen; großzügig 8–32 zugelassen).
const CODE_RE = /^[0-9a-f]{8,32}$/i;

/*
  Gemeinsamer Melde-Kern beider QR-Wege (bewusst NICHT exportiert → kein offener
  Endpunkt; nur die beiden Actions unten sind erreichbar, siehe
  use-server-Gate-Regel). Ab hier ist die Maschine bereits über einen Token
  autorisiert (Geräte-Token bzw. Sammlungs-Token + Zugehörigkeitsprüfung). `quelle`
  hält fest, WIE gemeldet wurde (geraet_qr = direkt gescannt; sammel_qr = aus der
  Sammlungsliste gewählt) — sichtbar als Kennzeichen am Fehler.
*/
async function meldeFehlerKern(eingabe: {
  machineId: string;
  beschreibung: string;
  name: string;
  bilder: File[];
  quelle: "geraet_qr" | "sammel_qr";
}): Promise<FormState> {
  const beschreibung = eingabe.beschreibung.trim();
  const name = eingabe.name.trim();

  if (!beschreibung) return { error: "Bitte beschreibe den Fehler." };
  if (beschreibung.length > 2000) {
    return { error: "Die Beschreibung ist zu lang (max. 2000 Zeichen)." };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    if (!name) return { error: "Bitte gib deinen Namen an." };
    if (name.length > 100) return { error: "Der Name ist zu lang." };
    // Nur Gäste bremsen (Token-Besitz ist die einzige Hürde); angemeldete
    // Meldungen sind über das Konto zurechenbar und bleiben unbegrenzt.
    if (await gastDuplikat(eingabe.machineId, beschreibung)) {
      // Als Erfolg quittieren — der Melder soll nicht raten, ob es geklappt
      // hat, aber es entsteht keine doppelte Zeile.
      return { message: "Danke! Dieser Fehler wurde bereits gemeldet." };
    }
    if ((await gastMeldungenImFenster(eingabe.machineId)) >= GAST_MAX_IM_FENSTER) {
      return {
        error:
          "Gerade gehen viele Meldungen zu diesem Gerät ein. Bitte in ein paar Minuten erneut versuchen.",
      };
    }
  }

  // Fotos ZUERST hochladen (Prüfung greift für Gäste wie Angemeldete); scheitert
  // es, wird kein Fehler angelegt. Gäste laden unter dem Segment „gast".
  if (
    eingabe.bilder.filter((f) => f instanceof File && f.size > 0).length >
    MAX_FAULT_IMAGES
  ) {
    return { error: `Höchstens ${MAX_FAULT_IMAGES} Bilder.` };
  }
  let urls: string[];
  try {
    urls = await uploadFaultImages(eingabe.bilder, currentUser?.id ?? "gast");
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Wie jede Fehler-Mutation: Anlegen + Betriebsstatus-Nachzug in EINEM Vorgang.
  const [neu] = await mitStatusNachzug(eingabe.machineId, (tx) =>
    tx
      .insert(faults)
      .values({
        machineId: eingabe.machineId,
        beschreibung,
        gemeldetVon: currentUser?.id ?? null,
        gemeldetVonName: currentUser ? null : name,
        quelle: eingabe.quelle,
      })
      .returning({ id: faults.id }),
  );
  if (urls.length > 0) {
    await db
      .insert(faultImages)
      .values(urls.map((url) => ({ faultId: neu.id, url })));
  }

  // Best-effort: Opt-in-Owner/Admins des Clubs per WhatsApp informieren — auch
  // Gast-Meldungen lösen aus. Neue QR-Meldungen sind immer „offen".
  try {
    await benachrichtigeUeberNeuenFehler({
      id: neu.id,
      machineId: eingabe.machineId,
      beschreibung,
      status: "offen",
    });
  } catch (e) {
    console.error("[whatsapp] Benachrichtigung fehlgeschlagen:", e);
  }

  return { message: "Danke! Der Fehler ist gemeldet und wird geprüft." };
}

/** Melden über den GERÄTE-QR (/m/<token>): direkt am Gerät gescannt. */
export async function meldeFehlerPerQr(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!CODE_RE.test(token)) return { error: "Ungültiger QR-Code." };
  const machine = await getMachineByQrToken(token);
  if (!machine) return { error: "Ungültiger QR-Code." };

  return meldeFehlerKern({
    machineId: machine.id,
    beschreibung: String(formData.get("beschreibung") ?? ""),
    name: String(formData.get("name") ?? ""),
    bilder: formData.getAll("bilder") as File[],
    quelle: "geraet_qr",
  });
}

/** Melden über den SAMMEL-QR (/s/<token>): ein Gerät wurde aus der Sammlungs-
    liste gewählt. Der Sammlungs-Token autorisiert NUR die Geräte dieser Sammlung
    — die gewählte machineId muss dazugehören (sonst könnte ein Gast eine fremde
    id unterschieben). Der Fehler wird als „sammel_qr" gekennzeichnet. */
export async function meldeFehlerPerSammelQr(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  const machineId = String(formData.get("machineId") ?? "").trim();

  if (!CODE_RE.test(code)) return { error: "Ungültiger QR-Code." };
  const sammlung = await getSammlungByToken(code);
  if (!sammlung) return { error: "Ungültiger QR-Code." };
  if (!sammlung.maschinen.some((m) => m.id === machineId)) {
    return { error: "Diese Maschine gehört nicht zur Sammlung." };
  }

  return meldeFehlerKern({
    machineId,
    beschreibung: String(formData.get("beschreibung") ?? ""),
    name: String(formData.get("name") ?? ""),
    bilder: formData.getAll("bilder") as File[],
    quelle: "sammel_qr",
  });
}
