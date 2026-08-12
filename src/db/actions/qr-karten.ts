"use server";

import { getMeineMaschinen } from "@/db/queries";
import { requireMachineAccess, requireUser } from "@/lib/session";
import { erzeugeQrSvg } from "@/lib/qr-code";
import { modellName } from "@/lib/format";

/*
  Server Actions für das QR-Druck-Studio: weitere Karten (anderer Maschinen)
  mit auf eine A4-Seite drucken. Beide Actions sind an die vorhandene
  Sichtbarkeit/Autorisierung gebunden — man findet und druckt nur Maschinen,
  die man ohnehin sehen darf.
*/

/** Typeahead: die für den Nutzer SICHTBAREN Maschinen (eigene + Club) nach
    Name gefiltert. Ohne Eingabe leer. */
export async function sucheMeineMaschinen(
  query: string,
): Promise<{ id: string; name: string }[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const me = await requireUser();
  const maschinen = await getMeineMaschinen(me, q);
  return maschinen.slice(0, 20).map((m) => ({ id: m.id, name: modellName(m) }));
}

/** QR-Karte (Name + Melde-SVG) einer Maschine — nur mit Lesezugriff. */
export async function qrKarteFuerMaschine(
  machineId: string,
): Promise<{ id: string; name: string; qrSvg: string } | { error: string }> {
  const zugriff = await requireMachineAccess(machineId).catch(() => null);
  if (!zugriff) return { error: "Kein Zugriff auf diese Maschine." };
  const { machine } = zugriff;
  return {
    id: machine.id,
    name: modellName(machine),
    qrSvg: await erzeugeQrSvg(machine.qrToken),
  };
}
