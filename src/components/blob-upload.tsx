"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { AlertTriangle, CheckCircle2, Paperclip, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  BILD_TYPEN,
  dokumentContentType,
  UPLOAD_ZWECKE,
  type UploadZweck,
} from "@/lib/upload-zweck";

/*
  Direkt-Upload in den Blob-Speicher (lib/upload-zweck.ts): jede gewählte Datei
  geht SOFORT vom Browser in den Speicher; das Formular trägt nur noch die URL.
  Grund: Vercel nimmt pro Anfrage höchstens 4,5 MB an (Feedback Kai 10/2026).

  - useBlobUpload: der Zustand (Dateien, lädt/ok/Fehler, Hinweis) — für eigene
    Oberflächen wie das Fehlerfoto-Raster oder die Screenshot-Drop-Zone.
  - UploadSperre: blockiert das Absenden, solange etwas lädt (Pflichtfeld mit
    eigener Gültigkeitsmeldung; der Browser zeigt sie am Feld).
  - UploadUrls: die versteckten Felder mit den URLs.
  - UploadFeld: fertiges Feld für EINE Datei (Maschinenfoto, Avatar, Dokument).
*/

/** Wofür hochgeladen wird — Zweck plus Kontext für die Berechtigung. */
export type UploadKontext = {
  zweck: UploadZweck;
  machineId?: string;
  /** Geräte-QR-Code (Gast-Meldung). */
  token?: string;
  /** Sammel-QR-Code (Gast-Meldung). */
  code?: string;
};

export type UploadDatei = {
  id: string;
  file: File;
  /** Objekt-URL für die Bild-Vorschau (nur Bilder). */
  vorschau: string | null;
  zustand: "laedt" | "ok" | "fehler";
  url?: string;
};

/** Content-Type, unter dem die Datei gespeichert wird — null = nicht erlaubt. */
function zielTyp(zweck: UploadZweck, file: File): string | null {
  if (zweck === "dokument") return dokumentContentType(file.name);
  return (BILD_TYPEN as readonly string[]).includes(file.type) ? file.type : null;
}

function endungFuer(typ: string, file: File): string {
  const ausName = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (ausName && ausName.length <= 5) return ausName;
  return typ.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
}

export function useBlobUpload(kontext: UploadKontext) {
  const regel = UPLOAD_ZWECKE[kontext.zweck];
  const [dateien, setDateien] = useState<UploadDatei[]>([]);
  const [hinweis, setHinweis] = useState<string | null>(null);

  // Vorschau-URLs beim Unmount freigeben.
  const dateienRef = useRef(dateien);
  useEffect(() => {
    dateienRef.current = dateien;
  }, [dateien]);
  useEffect(
    () => () =>
      dateienRef.current.forEach((d) => d.vorschau && URL.revokeObjectURL(d.vorschau)),
    [],
  );

  function setze(id: string, teil: Partial<UploadDatei>) {
    setDateien((alt) => alt.map((d) => (d.id === id ? { ...d, ...teil } : d)));
  }

  function entfernen(id: string) {
    setDateien((alt) => {
      const weg = alt.find((d) => d.id === id);
      if (weg?.vorschau) URL.revokeObjectURL(weg.vorschau);
      return alt.filter((d) => d.id !== id);
    });
  }

  async function hinzufuegen(gewaehlt: File[]) {
    const passend = gewaehlt.filter(
      (f) => zielTyp(kontext.zweck, f) && f.size <= regel.maxBytes,
    );
    const mb = regel.maxBytes / 1024 / 1024;
    setHinweis(
      passend.length < gewaehlt.length
        ? `${gewaehlt.length - passend.length} Datei(en) übersprungen — falsches Format oder größer als ${mb} MB.`
        : null,
    );
    if (passend.length === 0) return;

    // Eine Datei je Feld: die neue ersetzt die alte.
    const einzeln = regel.maxAnzahl === 1;
    const platz = einzeln ? 1 : Math.max(0, regel.maxAnzahl - dateien.length);
    const neu: UploadDatei[] = passend.slice(0, platz).map((file) => ({
      id: crypto.randomUUID(),
      file,
      vorschau: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      zustand: "laedt",
    }));
    if (neu.length === 0) return;
    if (einzeln) dateien.forEach((d) => entfernen(d.id));
    setDateien((alt) => [...(einzeln ? [] : alt), ...neu]);

    // Ordner erfragen (die Route prüft dabei schon die Berechtigung).
    const felder = Object.fromEntries(
      Object.entries(kontext).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>;
    let praefix: string;
    try {
      const res = await fetch(`/api/upload?${new URLSearchParams(felder)}`);
      const daten = (await res.json()) as { praefix?: string; error?: string };
      if (!daten.praefix) throw new Error(daten.error ?? "Upload nicht möglich.");
      praefix = daten.praefix;
    } catch (e) {
      setHinweis((e as Error).message);
      neu.forEach((d) => setze(d.id, { zustand: "fehler" }));
      return;
    }

    await Promise.all(
      neu.map(async (d) => {
        const typ = zielTyp(kontext.zweck, d.file)!;
        try {
          const blob = await upload(
            `${praefix}${crypto.randomUUID()}.${endungFuer(typ, d.file)}`,
            d.file,
            {
              access: "public",
              handleUploadUrl: "/api/upload",
              clientPayload: JSON.stringify(felder),
              contentType: typ,
            },
          );
          setze(d.id, { zustand: "ok", url: blob.url });
        } catch {
          setze(d.id, { zustand: "fehler" });
        }
      }),
    );
  }

  return {
    dateien,
    hinweis,
    laedt: dateien.some((d) => d.zustand === "laedt"),
    fehlgeschlagen: dateien.some((d) => d.zustand === "fehler"),
    hinzufuegen,
    entfernen,
    maxAnzahl: regel.maxAnzahl,
  };
}

/** Blockiert das Absenden des umgebenden Formulars, solange `laedt`. */
export function UploadSperre({ laedt }: { laedt: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.setCustomValidity(laedt ? "Datei wird noch hochgeladen …" : "");
  }, [laedt]);
  return (
    <input ref={ref} tabIndex={-1} aria-hidden className="sr-only" defaultValue="x" />
  );
}

/** Versteckte Felder mit den URLs der fertig hochgeladenen Dateien. */
export function UploadUrls({ name, dateien }: { name: string; dateien: UploadDatei[] }) {
  return (
    <>
      {dateien.map((d) =>
        d.zustand === "ok" && d.url ? (
          <input key={d.id} type="hidden" name={name} value={d.url} />
        ) : null,
      )}
    </>
  );
}

/*
  Feld für EINE Datei. Legt `name` (URL) ins Formular, mit `dateinameFeld`
  zusätzlich den Original-Dateinamen (Dokumente). Ohne Auswahl bleibt das Feld
  leer — die Aktion behält dann den bisherigen Wert.
*/
export function UploadFeld({
  kontext,
  name,
  accept,
  dateinameFeld,
  required,
}: {
  kontext: UploadKontext;
  name: string;
  accept: string;
  dateinameFeld?: string;
  required?: boolean;
}) {
  const pickRef = useRef<HTMLInputElement>(null);
  const up = useBlobUpload(kontext);
  const d = up.dateien[0];

  return (
    <div className="space-y-2">
      <UploadUrls name={name} dateien={up.dateien} />
      {dateinameFeld && d?.zustand === "ok" ? (
        <input type="hidden" name={dateinameFeld} value={d.file.name} />
      ) : null}
      <UploadSperre laedt={up.laedt} />
      {/* Pflicht-Upload: leeres, verstecktes Pflichtfeld, bis eine Datei da ist. */}
      {required && d?.zustand !== "ok" ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          required
          defaultValue=""
          onInvalid={(e) => e.currentTarget.setCustomValidity("Bitte eine Datei wählen.")}
        />
      ) : null}
      <input
        ref={pickRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = Array.from(e.target.files ?? []);
          e.target.value = "";
          void up.hinzufuegen(f);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => pickRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Paperclip size={15} /> {d ? "Andere Datei wählen" : "Datei wählen"}
        </button>
        {d ? (
          <span className="flex min-w-0 items-center gap-2 text-sm text-[var(--color-muted)]">
            {d.vorschau ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.vorschau} alt="" className="h-10 w-10 flex-none rounded-[4px] object-cover" />
            ) : null}
            <span className="truncate">{d.file.name}</span>
            {d.zustand === "laedt" ? <Spinner size={14} /> : null}
            {d.zustand === "ok" ? (
              <CheckCircle2 size={15} className="flex-none text-[var(--color-success)]" />
            ) : null}
            {d.zustand === "fehler" ? (
              <AlertTriangle size={15} className="flex-none text-[var(--color-danger)]" />
            ) : null}
            <button
              type="button"
              onClick={() => up.entfernen(d.id)}
              aria-label="Datei entfernen"
              className="flex-none rounded p-0.5 hover:text-[var(--color-fg)]"
            >
              <X size={14} />
            </button>
          </span>
        ) : null}
      </div>
      {up.hinweis ? (
        <p className="text-xs text-[var(--color-danger)]">{up.hinweis}</p>
      ) : null}
      {up.fehlgeschlagen ? (
        <p className="text-xs text-[var(--color-danger)]">
          Hochladen fehlgeschlagen — bitte erneut wählen.
        </p>
      ) : null}
    </div>
  );
}
