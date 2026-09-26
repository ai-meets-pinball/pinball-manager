import { ZoomIn } from "lucide-react";

/*
  Klickbares Foto mit Lupe unten rechts (Klick öffnet das Bild groß). Zwei
  Formen:
  - frei (Standard, Kopf einer Detailseite — Maschine, Modell): eigenes
    Seitenverhältnis, nur nach oben begrenzt. Uploads und Katalogbilder sind
    heterogen (Backglass hochkant, Gerät quer), ein fester Rahmen beschneidet
    oder letterboxt.
  - quadrat (Vorschauen in Listen, z. B. Fehler-Fotos): festes Quadrat,
    das Bild darin EINGEPASST (nichts abgeschnitten) — nebeneinander wären
    wechselnde Rahmen unruhig, ein Beschnitt nähme Translites den Rand.
*/
export function FotoZoom({
  src,
  alt,
  quadrat = false,
}: {
  src: string;
  alt: string;
  /** Festes 80-px-Quadrat (Bild eingepasst) statt freiem Seitenverhältnis. */
  quadrat?: boolean;
}) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title="Foto vergrößern"
      className={
        quadrat
          ? "relative block h-20 w-20 flex-none overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-inset)]"
          : "relative flex-none"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={
          quadrat
            ? "h-full w-full object-contain"
            : "h-auto max-h-24 w-auto max-w-40 rounded-[var(--radius)] border border-[var(--color-border)] sm:max-h-36 sm:max-w-56"
        }
      />
      <span
        aria-hidden
        className="absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-muted)]"
      >
        <ZoomIn size={13} />
      </span>
    </a>
  );
}
