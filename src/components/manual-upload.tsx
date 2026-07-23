"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { AiProviderField } from "@/components/ui/ai-provider-field";
import { Button } from "@/components/ui/button";
import type { AiProvider } from "@/lib/ai/provider";

/*
  Upload eines eigenen Handbuchs (PDF) zur Fakten-Extraktion. Läuft über die
  streamende API-Route /api/machines/[id]/extract-manual: der Client liest die
  Fortschritts-Events (NDJSON) und zeigt bei großen gescannten Handbüchern live an,
  welcher Abschnitt gerade verarbeitet wird. Das PDF wird nie gespeichert.
*/

const LABELS: Record<string, string> = {
  coils: "Spulen",
  switches: "Schalter",
  lamps: "Lampen",
  fuses: "Sicherungen",
  parts: "Teile",
  rules: "Regeln",
};

function summary(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(
    ([typ, n]) => `${LABELS[typ] ?? typ} (${n})`,
  );
  return parts.length > 0
    ? `Extrahiert: ${parts.join(", ")}.`
    : "Keine Tabellen im Handbuch gefunden.";
}

type Fortschritt =
  | { kind: "idle" }
  | { kind: "running"; label: string; batch?: number; totalBatches?: number }
  | { kind: "done"; counts: Record<string, number> }
  | { kind: "error"; error: string };

const MAX_MB = 50;

export function ManualUpload({
  machineId,
  providers,
  centralKey,
}: {
  machineId: string;
  /** Verfügbare KI-Anbieter (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [zuGross, setZuGross] = useState(false);
  // Client-Vorabprüfung der Größe: ein zu großes PDF würde sonst am Proxy-Body-
  // Limit abgeschnitten und kryptisch scheitern.
  const [prog, setProg] = useState<Fortschritt>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || zuGross) return;
    const form = e.currentTarget;
    const fd = new FormData(form);

    setPending(true);
    setProg({ kind: "running", label: "Handbuch wird hochgeladen …" });

    try {
      const res = await fetch(`/api/machines/${machineId}/extract-manual`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setProg({ kind: "error", error: data?.error ?? "Upload fehlgeschlagen." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let counts: Record<string, number> | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "start") {
            setProg({
              kind: "running",
              label:
                ev.mode === "vision"
                  ? `Gescanntes Handbuch: ${ev.totalPages} Seiten in ${ev.totalBatches} Abschnitten`
                  : "Handbuch wird verarbeitet …",
              totalBatches: ev.totalBatches,
            });
          } else if (ev.type === "batch") {
            setProg({
              kind: "running",
              label: `Abschnitt ${ev.batch}/${ev.totalBatches} · Seiten ${ev.fromPage}–${ev.toPage}`,
              batch: ev.batch,
              totalBatches: ev.totalBatches,
            });
          } else if (ev.type === "info") {
            setProg((p) =>
              p.kind === "running"
                ? { ...p, label: ev.message }
                : { kind: "running", label: ev.message },
            );
          } else if (ev.type === "done") {
            counts = ev.counts;
          } else if (ev.type === "error") {
            setProg({ kind: "error", error: ev.error });
            return;
          }
        }
      }

      if (counts) {
        setProg({ kind: "done", counts });
        form.reset();
        setZuGross(false);
        router.refresh(); // neu extrahierte Fakten anzeigen
      }
    } catch (err) {
      setProg({
        kind: "error",
        error: (err as Error).message || "Netzwerkfehler bei der Verarbeitung.",
      });
    } finally {
      setPending(false);
    }
  }

  const prozent =
    prog.kind === "running" && prog.batch && prog.totalBatches
      ? Math.round((prog.batch / prog.totalBatches) * 100)
      : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Handbuch (PDF, max. {MAX_MB} MB)</span>
        <input
          name="manual"
          type="file"
          accept="application/pdf"
          required
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            setZuGross(!!f && f.size > MAX_MB * 1024 * 1024);
          }}
          className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--color-inset)] file:px-3 file:py-1 file:text-[var(--color-fg)] focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
        <input
          type="checkbox"
          name="attest"
          required
          className="mt-0.5 accent-[var(--color-accent)]"
        />
        <span>
          Ich bestätige, dass ich dieses Handbuch besitze bzw. die Rechte habe, es
          zu verarbeiten. Es wird nicht gespeichert — nur die extrahierten
          Faktentabellen (Spulen, Lampen, Schalter, Sicherungen, Teile, Regeln).
        </span>
      </label>

      <AiProviderField providers={providers} centralKey={centralKey} />

      <label className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
        <input type="checkbox" name="highDetail" className="mt-0.5 accent-[var(--color-accent)]" />
        <span>
          Hohe Detailstufe (nur Claude): Seiten werden hochauflösend an Sonnet
          geschickt — für schwer lesbare Scans, bei denen die normale Auswertung
          leer bleibt. Langsamer und teurer.
        </span>
      </label>

      {zuGross ? (
        <p className="text-sm text-[var(--color-danger)]">
          Datei zu groß (maximal {MAX_MB} MB). Bitte ein kleineres PDF wählen.
        </p>
      ) : null}

      {prog.kind === "running" ? (
        <div className="space-y-1.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 size={15} className="animate-spin text-[var(--color-primary)]" />
            <span>{prog.label}</span>
          </div>
          {prozent !== null ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                  style={{ width: `${prozent}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                {prozent}% — gescannte Handbücher dauern je nach Seitenzahl mehrere
                Minuten. Bitte das Fenster geöffnet lassen.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {prog.kind === "error" ? (
        <p className="text-sm text-[var(--color-danger)]">{prog.error}</p>
      ) : null}
      {prog.kind === "done" ? (
        <p className="text-sm text-[var(--color-success)]">{summary(prog.counts)}</p>
      ) : null}

      <Button type="submit" disabled={pending || zuGross} className="self-start">
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Verarbeite …
          </>
        ) : (
          <>
            <FileText size={16} /> Handbuch auswerten
          </>
        )}
      </Button>
    </form>
  );
}
