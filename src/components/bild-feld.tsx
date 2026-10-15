"use client";

import { useRef } from "react";
import { AlertTriangle, Camera, X } from "lucide-react";
import { UrheberHinweis } from "@/components/ui/urheber-hinweis";
import { Spinner } from "@/components/ui/spinner";
import {
  UploadSperre,
  UploadUrls,
  useBlobUpload,
  type UploadKontext,
} from "@/components/blob-upload";

/*
  Mehrere Fotos zu einem Fehler — mobil optimiert: `accept="image/*"` öffnet auf
  dem Handy die Auswahl „Kamera ODER Galerie" (kein erzwungenes `capture`, damit
  beides geht), `multiple` erlaubt mehrere aus der Galerie.

  Jedes Foto geht sofort direkt in den Speicher (components/blob-upload.tsx);
  das Formular trägt nur die URLs (`bildUrl`). Solange eines lädt, ist das
  Absenden gesperrt.
*/
export function BildFeld({
  kontext,
}: {
  /** Wo gemeldet wird — davon hängt ab, wer hochladen darf. */
  kontext: Omit<UploadKontext, "zweck">;
}) {
  const pickRef = useRef<HTMLInputElement>(null);
  const up = useBlobUpload({ ...kontext, zweck: "fehlerfoto" });
  const voll = up.dateien.length >= up.maxAnzahl;

  return (
    <div className="space-y-2">
      <UploadUrls name="bildUrl" dateien={up.dateien} />
      <UploadSperre laedt={up.laedt} />
      {/* Zum Auswählen/Aufnehmen (Kamera oder Galerie). */}
      <input
        ref={pickRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const f = Array.from(e.target.files ?? []);
          e.target.value = ""; // dieselbe Datei erneut erlauben
          void up.hinzufuegen(f);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {up.dateien.map((d) => (
          <div
            key={d.id}
            className="relative h-20 w-20 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]"
          >
            {d.vorschau ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.vorschau} alt="" className="h-full w-full object-cover" />
            ) : null}
            {d.zustand === "laedt" ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                <Spinner size={18} />
              </span>
            ) : null}
            {d.zustand === "fehler" ? (
              <span
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-[var(--color-danger)]"
                title="Hochladen fehlgeschlagen"
              >
                <AlertTriangle size={20} />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => up.entfernen(d.id)}
              aria-label="Bild entfernen"
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {!voll ? (
          <button
            type="button"
            onClick={() => pickRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
          >
            <Camera size={20} />
            Foto
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        {up.dateien.length}/{up.maxAnzahl} Bilder{voll ? " (Maximum erreicht)" : ""}
        {up.laedt ? " · wird hochgeladen …" : ""}
      </p>
      {up.hinweis ? (
        <p className="text-xs text-[var(--color-danger)]">{up.hinweis}</p>
      ) : null}
      {up.fehlgeschlagen ? (
        <p className="text-xs text-[var(--color-danger)]">
          Ein Foto konnte nicht hochgeladen werden — entfernen und erneut wählen.
          Ohne das Foto lässt sich trotzdem melden.
        </p>
      ) : null}
      <UrheberHinweis />
    </div>
  );
}
