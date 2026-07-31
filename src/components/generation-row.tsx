"use client";

import { useActionState, useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list";
import { deleteGeneration, renameGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/clubs";
import { modellName } from "@/lib/format";

/*
  Eine Generation als Listenzeile: ANZEIGEN zuerst, Bearbeiten auf Verlangen.
  Der Stift schaltet GENAU DIESE Zeile in den Bearbeiten-Modus (Autofokus,
  Escape/Abbrechen verwerfen, Speichern schließt bei Erfolg, Fehler — z. B.
  Namenskonflikt — bleiben sichtbar).

  Der Untertitel („N Modelle · Jahre") ist AUFKLAPPBAR (natives <details>,
  funktioniert ohne JS): ein Klick zeigt die Modelle dieser Generation.
*/
type Modell = { hersteller: string; modell: string; baujahr: number | null };

export function GenerationRow({
  id,
  name,
  untertitel,
  modelle,
}: {
  id: string;
  name: string;
  /** z. B. „12 Modelle · 1979–1984" — Trigger der Aufklapp-Liste. */
  untertitel: string;
  /** Modelle dieser Generation (für die Aufklapp-Liste). */
  modelle: Modell[];
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    renameGeneration,
    {},
  );

  // Bei Erfolg den Bearbeiten-Modus schließen (die Zeile zeigt den neuen Namen
  // nach dem revalidatePath der Action). Muster „adjust state during render":
  // useActionState liefert je Durchlauf ein NEUES state-Objekt — die Identität
  // sagt uns, dass eine Antwort kam; kein useEffect nötig.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.message) setBearbeiten(false);
  }

  return (
    <ListRow
      title={name}
      actions={
        <>
          <button
            type="button"
            onClick={() => setBearbeiten((b) => !b)}
            aria-expanded={bearbeiten}
            aria-label="Umbenennen"
            title="Umbenennen"
            className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <Pencil size={16} />
          </button>
          <form action={deleteGeneration}>
            <input type="hidden" name="id" value={id} />
            <ConfirmButton
              question="Generation löschen? Die Zuordnung der Modelle entfällt."
              confirmLabel="Ja, löschen"
              aria-label="Generation löschen"
            >
              <Trash2 size={16} />
            </ConfirmButton>
          </form>
        </>
      }
    >
      <div className="space-y-2">
        {bearbeiten ? (
          <form
            action={formAction}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={id} />
            <Input
              name="name"
              defaultValue={name}
              autoFocus
              aria-label="Neuer Name"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Escape") setBearbeiten(false);
              }}
            />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
            <button
              type="button"
              onClick={() => setBearbeiten(false)}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              Abbrechen
            </button>
            <FormFeedback state={state} />
          </form>
        ) : null}

        {modelle.length > 0 ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] [&::-webkit-details-marker]:hidden">
              <ChevronRight
                size={14}
                className="transition-transform group-open:rotate-90"
              />
              {untertitel}
            </summary>
            <ul className="mt-2 grid gap-x-6 gap-y-1 border-t border-[var(--color-border)] pt-2 text-sm text-[var(--color-muted)] sm:grid-cols-2">
              {modelle.map((m, i) => (
                <li key={i} className="truncate">
                  {modellName(m)}
                  {m.baujahr ? (
                    <span className="text-[var(--color-faint)]">
                      {" "}
                      · {m.baujahr}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">{untertitel}</p>
        )}
      </div>
    </ListRow>
  );
}
