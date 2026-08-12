"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/*
  Mehrere Fotos anhängen — mobil optimiert: `accept="image/*"` öffnet auf dem
  Handy die Auswahl „Kamera ODER Galerie" (kein erzwungenes `capture`, damit
  beides geht), `multiple` erlaubt mehrere aus der Galerie; per Kamera kommt je
  Aufnahme eines dazu (Knopf erneut tippen). Die gewählten Dateien liegen im
  React-State und werden in einen verborgenen `<input type=file multiple name>`
  gespiegelt (DataTransfer), damit sie im normalen Server-Form-Submit mitreisen
  — inklusive einzelnem Entfernen (nativer FileList ginge das nicht).
*/
type Bild = { file: File; url: string };

export function BildFeld({
  name = "bilder",
  max = 5,
}: {
  /** Feldname im FormData (Server: formData.getAll(name)). */
  name?: string;
  max?: number;
}) {
  const submitRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const [bilder, setBilder] = useState<Bild[]>([]);

  // State → verborgenes File-Input spiegeln (so reist die Auswahl im Submit mit).
  useEffect(() => {
    if (!submitRef.current) return;
    const dt = new DataTransfer();
    for (const b of bilder) dt.items.add(b.file);
    submitRef.current.files = dt.files;
  }, [bilder]);

  // Objekt-URLs beim Unmount freigeben.
  useEffect(
    () => () => bilder.forEach((b) => URL.revokeObjectURL(b.url)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function hinzufuegen(dateien: FileList | null) {
    if (!dateien) return;
    const neue = Array.from(dateien)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setBilder((alt) => [...alt, ...neue].slice(0, max));
    if (pickRef.current) pickRef.current.value = ""; // erneut dieselbe Datei erlauben
  }

  function entfernen(i: number) {
    setBilder((alt) => {
      URL.revokeObjectURL(alt[i].url);
      return alt.filter((_, k) => k !== i);
    });
  }

  const voll = bilder.length >= max;

  return (
    <div className="space-y-2">
      {/* Trägt die Auswahl in den Submit. */}
      <input
        ref={submitRef}
        type="file"
        name={name}
        multiple
        className="hidden"
      />
      {/* Zum Auswählen/Aufnehmen (Kamera oder Galerie). */}
      <input
        ref={pickRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => hinzufuegen(e.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        {bilder.map((b, i) => (
          <div
            key={b.url}
            className="relative h-20 w-20 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => entfernen(i)}
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
        {bilder.length}/{max} Bilder{voll ? " (Maximum erreicht)" : ""}
      </p>
    </div>
  );
}
