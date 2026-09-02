"use client";

import { Save } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Input } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";
import { saveWhatsappNummer, toggleWhatsappOptin } from "@/db/actions/whatsapp";

/*
  Globale WhatsApp-Nummer im Profil. Das eigentliche Opt-in erfolgt PRO CLUB
  (WhatsappClubSchalter unten); ohne Nummer geht auch mit aktiviertem
  Club-Schalter nichts raus. Speichern ist erst aktiv, wenn die Eingabe vom
  gespeicherten Stand abweicht.
*/
export function WhatsappSettingsForm({ nummer }: { nummer: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveWhatsappNummer,
    {},
  );
  const [eingabe, setEingabe] = useState(nummer ?? "");
  const unveraendert = eingabe.trim() === (nummer ?? "");

  return (
    <form action={formAction} className="space-y-3">
      <Field
        label="WhatsApp-Nummer"
        hint="Internationale Vorwahl, z. B. +49151… — leer lassen entfernt die Nummer."
      >
        <Input
          type="tel"
          name="nummer"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          placeholder="+49151…"
          autoComplete="tel"
        />
      </Field>

      <FormFeedback state={state} />

      <Button type="submit" disabled={pending || unveraendert}>
        <Save size={16} /> {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}

/*
  Ein Schalter je Club, der beim Umschalten sofort speichert (kleines,
  reversibles Setting — kein eigener Speichern-Knopf). Ohne hinterlegte Nummer
  lässt sich nichts EINschalten; ausschalten geht immer. Die Action flippt den
  gespeicherten Wert (toggleWhatsappOptin), das Häkchen zeigt den Stand vom
  Server — daher `defaultChecked` statt eines eigenen Zustands.
*/
export function WhatsappClubSchalter({
  clubId,
  name,
  aktiv,
  nummerVorhanden,
}: {
  clubId: string;
  name: string;
  aktiv: boolean;
  nummerVorhanden: boolean;
}) {
  const gesperrt = !aktiv && !nummerVorhanden;
  return (
    <form action={toggleWhatsappOptin}>
      <input type="hidden" name="clubId" value={clubId} />
      <label
        className={`flex items-center gap-2 text-sm ${gesperrt ? "cursor-not-allowed opacity-60" : ""}`}
        title={gesperrt ? "Erst eine Nummer hinterlegen" : undefined}
      >
        <input
          type="checkbox"
          defaultChecked={aktiv}
          disabled={gesperrt}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          aria-label={`WhatsApp-Benachrichtigung für ${name}`}
          className="h-4 w-4"
        />
        <span className="font-medium">{name}</span>
      </label>
    </form>
  );
}
