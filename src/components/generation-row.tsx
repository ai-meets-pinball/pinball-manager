"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list";
import { deleteGeneration, renameGeneration } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/clubs";

/*
  Eine Generation als Listenzeile: ANZEIGEN zuerst, Bearbeiten auf Verlangen.
  Vorher war jede Zeile ein permanent editierbares Eingabefeld mit eigenem
  „Umbenennen"-Button — 54 offene Formulare auf einmal (laut, fehleranfällig,
  ohne klare Lesehierarchie). Jetzt: normale ListRow; der Stift schaltet GENAU
  DIESE Zeile in den Bearbeiten-Modus (Autofokus, Escape/Abbrechen verwerfen,
  Speichern schließt bei Erfolg, Fehler — z. B. Namenskonflikt — bleiben sichtbar).
*/
export function GenerationRow({
  id,
  name,
  untertitel,
}: {
  id: string;
  name: string;
  /** z. B. „12 Modelle · 1979–1984" */
  untertitel: string;
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
      subtitle={untertitel}
      actions={
        <>
          <button
            type="button"
            onClick={() => setBearbeiten((b) => !b)}
            aria-expanded={bearbeiten}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <Pencil size={14} /> Umbenennen
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
      {bearbeiten ? (
        <form
          action={formAction}
          className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3"
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
    </ListRow>
  );
}
