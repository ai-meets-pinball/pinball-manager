import { ListChecks } from "lucide-react";

/*
  Kennzeichen, dass ein Fehler NICHT direkt am Gerät gescannt, sondern über den
  Sammlungs-QR aus einer Liste GEWÄHLT wurde (der Melder stand evtl. nicht am
  Gerät — geringere Sicherheit, dass es wirklich dieses Gerät betrifft). Rendert
  bewusst NUR in diesem Fall; für „geraet_qr"/„app" gibt es kein Kennzeichen.
*/
export function QuelleBadge({ quelle }: { quelle?: string | null }) {
  if (quelle !== "sammel_qr") return null;
  return (
    <span
      title="Gerät aus einer Liste gewählt (Sammel-QR) — nicht direkt am Gerät gescannt."
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-inset)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]"
    >
      <ListChecks size={11} /> Sammel-QR
    </span>
  );
}
