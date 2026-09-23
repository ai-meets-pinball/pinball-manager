import { and, eq, gte, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { faults, machines, user } from "@/db/schema";
import { sendNeuerFehlerEmail } from "@/lib/email";
import { MAIL_SPERRE_MINUTEN, sollEigentuemerMailen } from "@/lib/fehler-mail";
import { modellName } from "@/lib/format";
import { baseUrl } from "@/lib/qr-code";

/*
  Fehler-Mail an den Eigentümer einer PRIVATEN Maschine — das Gegenstück zur
  WhatsApp-Benachrichtigung für Club-Maschinen (whatsapp-benachrichtigung.ts).
  Wie dort BEWUSST ohne "use server" (wird aus dem offenen QR-Melde-Pfad
  gerufen) und best effort: die Aufrufer fangen Fehler ab, eine Meldung darf
  nie am Mailversand scheitern.

  Die Entscheidung (privat? Fremd-Meldung? Sperre abgelaufen?) liegt in
  lib/fehler-mail.ts — hier werden nur die Zutaten geladen und die Mail
  verschickt. Die Sperre je Maschine kommt aus den vorhandenen Fehlern: gab es
  im Fenster schon eine Fremd-Meldung, schweigt die Mail.
*/
export async function maileEigentuemerUeberNeuenFehler(fault: {
  id: string;
  machineId: string;
  beschreibung: string;
  /** Angemeldeter Melder oder null (Gast). */
  melderId: string | null;
  /** Anzeigename des Melders, bei Gästen „<Name> (Gast)". */
  melderName: string;
}): Promise<void> {
  const [maschine] = await db
    .select({
      clubId: machines.clubId,
      ownerId: machines.ownerId,
      hersteller: machines.hersteller,
      modell: machines.modell,
    })
    .from(machines)
    .where(eq(machines.id, fault.machineId))
    .limit(1);
  if (!maschine) return;

  const seit = new Date(Date.now() - MAIL_SPERRE_MINUTEN * 60_000);
  const fruehere = await db
    .select({ datum: faults.datum })
    .from(faults)
    .where(
      and(
        eq(faults.machineId, fault.machineId),
        ne(faults.id, fault.id),
        gte(faults.datum, seit),
        // Fremd-Meldung = Gast (NULL) oder ein anderer Nutzer als der Eigentümer.
        or(isNull(faults.gemeldetVon), ne(faults.gemeldetVon, maschine.ownerId)),
      ),
    );

  const mailen = sollEigentuemerMailen({
    clubId: maschine.clubId,
    ownerId: maschine.ownerId,
    melderId: fault.melderId,
    fruehereFremdMeldungen: fruehere.map((f) => f.datum),
  });
  if (!mailen) return;

  const [eigentuemer] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, maschine.ownerId))
    .limit(1);
  if (!eigentuemer?.email) return;

  await sendNeuerFehlerEmail(eigentuemer.email, {
    maschine: modellName(maschine),
    beschreibung: fault.beschreibung,
    melder: fault.melderName,
    url: `${baseUrl()}/machines/${fault.machineId}?bereich=fehler`,
  });
}
