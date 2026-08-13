import Link from "next/link";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Pencil, Trash2, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { RepairSuggestButton } from "@/components/repair-suggest-button";
import { deleteFault } from "@/db/actions/faults";
import type { AiProvider } from "@/lib/ai/provider";

type Fault = {
  id: string;
  beschreibung: string;
  kategorie: string | null;
  prioritaet: string;
  status: string;
  datum: Date;
  melderName?: string | null;
  /** Angehängte Fotos (URLs). */
  bilder?: string[];
};

export function FaultList({
  faults,
  machineId,
  schreibbar = true,
  kiProviders = [],
  kiCentralKey = false,
}: {
  faults: Fault[];
  machineId: string;
  /** false = nur Lesen (z. B. Supporter): keine Bearbeiten-/Lösch-/Reparatur-Aktionen. */
  schreibbar?: boolean;
  /** Verfügbare KI-Anbieter (leer = keine → kein Vorschlags-Button). */
  kiProviders?: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? (sonst BYO-Feld im Vorschlag). */
  kiCentralKey?: boolean;
}) {
  if (faults.length === 0) {
    return <p className="text-[var(--color-muted)]">Keine Fehler erfasst.</p>;
  }

  return (
    <div className="space-y-3">
      {faults.map((fault) => (
        <Card key={fault.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={fault.status} />
            <StatusBadge value={fault.prioritaet} />
            {fault.kategorie ? (
              <span className="text-xs text-[var(--color-muted)]">
                {fault.kategorie}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-[var(--color-muted)]">
              {fault.datum.toLocaleDateString("de-DE")}
              {fault.melderName ? ` · ${fault.melderName}` : ""}
            </span>
          </div>

          <p className="whitespace-pre-wrap">{fault.beschreibung}</p>

          {fault.bilder && fault.bilder.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fault.bilder.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-20 w-20 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Foto zum Fehler"
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : null}

          {schreibbar ? (
            <div className="flex gap-3 text-sm">
              <Link
                href={`/machines/${machineId}/repairs/new?faultId=${fault.id}`}
                className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
              >
                <Wrench size={14} /> Reparatur erfassen
              </Link>
              <Link
                href={`/machines/${machineId}/faults/${fault.id}/edit`}
                className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              >
                <Pencil size={14} /> Bearbeiten
              </Link>
              <form action={deleteFault}>
                <input type="hidden" name="machineId" value={machineId} />
                <input type="hidden" name="id" value={fault.id} />
                <ConfirmButton
                  question="Diesen Fehler löschen?"
                  confirmLabel="Ja, löschen"
                  className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 size={14} /> Löschen
                </ConfirmButton>
              </form>
            </div>
          ) : null}

          {schreibbar && kiProviders.length > 0 ? (
            <RepairSuggestButton
              machineId={machineId}
              fault={{
                id: fault.id,
                beschreibung: fault.beschreibung,
                status: fault.status,
              }}
              providers={kiProviders}
              centralKey={kiCentralKey}
            />
          ) : null}
        </Card>
      ))}
    </div>
  );
}
