"use client";

import { useActionState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { importGenerationCatalog } from "@/db/actions/generations";
import type { FormState } from "@/db/actions/clubs";

/*
  Katalog-Upload (Super-Admin): eine Export-JSON einspielen. Idempotent — kann
  bei einer aktualisierten Export-Datei erneut laufen, ohne Hand-Zuordnungen zu
  überschreiben. Zeigt danach die Zusammenfassung des Imports.
*/
export function CatalogImport() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    importGenerationCatalog,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Katalog-Export (JSON)</span>
        <input
          name="katalog"
          type="file"
          accept="application/json,.json"
          required
          className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--color-inset)] file:px-3 file:py-1 file:text-[var(--color-fg)] focus:border-[var(--color-accent)]"
        />
      </label>

      <FormFeedback state={state} />

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Importiere …
          </>
        ) : (
          <>
            <Upload size={16} /> Katalog importieren
          </>
        )}
      </Button>
    </form>
  );
}
