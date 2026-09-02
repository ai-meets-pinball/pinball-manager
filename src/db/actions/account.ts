"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  fallbackSuperAdmin,
  loeschBlocker,
  loescheNutzer,
} from "@/db/konto-loeschung";
import type { FormState } from "@/db/actions/form-state";

/*
  Konto-Löschung (DSGVO Art. 17), Self-Service: bestätigen (E-Mail tippen) →
  Guards → löschen. Das Wie (Storage, Übertragen, Anonymisieren, Transaktion)
  steht in db/konto-loeschung.ts und wird vom Admin-Weg mitbenutzt. Danach ist
  die Session ungültig → zurück auf die Startseite.
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

  // Fallback-Super-Admin: Ziel, an das erstellte/geteilte Inhalte übertragen
  // werden (Autorschaft bleibt sauber, Inhalt geht nicht verloren).
  const fallbackId = await fallbackSuperAdmin(me.id);
  const blocker = await loeschBlocker(me.id, fallbackId);
  if (blocker?.art === "alleinOwner") {
    return {
      error: `Du bist alleiniger Owner von: ${blocker.clubs.join(
        ", ",
      )}. Übertrage die Ownerschaft an ein anderes Mitglied oder lösche diese Clubs zuerst — danach lässt sich dein Konto löschen.`,
    };
  }
  if (blocker?.art === "keinFallback" || !fallbackId) {
    return {
      error:
        "Konto-Löschung aktuell nicht möglich (kein Ziel zum Übertragen erstellter/geteilter Inhalte). Bitte wende dich an den Betreiber.",
    };
  }

  await loescheNutzer(me.id, fallbackId);
  redirect("/");
}
