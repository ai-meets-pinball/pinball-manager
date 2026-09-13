"use client";

import { toggleKiInDerApp } from "@/db/actions/settings";

/*
  Nur für den Super-Admin: KI in der App über den Plattform-Schlüssel nutzen —
  oder bewusst wie ein normaler Nutzer den Prompt-Weg gehen (etwa um die
  Oberfläche so zu sehen, wie alle sie sehen). Schalter speichert sofort
  (Muster WhatsappClubSchalter): die Action flippt den gespeicherten Wert, das
  Häkchen zeigt den Stand vom Server — daher `defaultChecked`.
*/
export function KiSettingsForm({ aktiv }: { aktiv: boolean }) {
  return (
    <form action={toggleKiInDerApp} className="space-y-2">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="kiInDerApp"
          defaultChecked={aktiv}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">KI in der App nutzen (Plattform-Schlüssel)</span>
          <span className="block text-[var(--color-muted)]">
            Aus: du siehst die Oberfläche genau so wie ein normaler Nutzer —
            dieselben Sperren, derselbe Wortlaut, kein Sonderhinweis — und
            gehst den Prompt-Weg mit deinem eigenen Abo. Der Reparaturvorschlag
            bleibt in beiden Fällen verfügbar.
          </span>
        </span>
      </label>
    </form>
  );
}
