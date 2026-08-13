"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { savePrompt } from "@/db/actions/prompts";
import type { FormState } from "@/db/actions/form-state";

/*
  Neuen Hersteller-/Generation-Override zu einem Prompt anlegen. Bereich ist
  exklusiv (Hersteller ODER Generation); die Vorlage ist mit dem Code-Standard
  vorbefüllt und dann anpassbar. Speichert über savePrompt (Upsert).
*/
export function PromptOverrideNeu({
  promptKey,
  standard,
  hersteller,
  generationen,
  herstellerScoped,
  generationScoped,
}: {
  promptKey: string;
  standard: string;
  hersteller: string[];
  generationen: { id: string; name: string }[];
  herstellerScoped: boolean;
  generationScoped: boolean;
}) {
  const router = useRouter();
  const [typ, setTyp] = useState<"hersteller" | "generation">(
    herstellerScoped ? "hersteller" : "generation",
  );
  const [wert, setWert] = useState("");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await savePrompt(prev, fd);
      if (res.message) {
        setWert("");
        router.refresh();
      }
      return res;
    },
    {},
  );

  return (
    <details className="rounded-[var(--radius)] border border-dashed border-[var(--color-border)]">
      <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <Plus size={14} /> Hersteller-/Generation-Override hinzufügen
      </summary>
      <form action={formAction} className="space-y-3 p-3 pt-0">
        <input type="hidden" name="key" value={promptKey} />
        {/* Exklusiver Bereich: genau eines der beiden Felder wird gefüllt. */}
        <input
          type="hidden"
          name="hersteller"
          value={typ === "hersteller" ? wert : ""}
        />
        <input
          type="hidden"
          name="generationId"
          value={typ === "generation" ? wert : ""}
        />

        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Field label="Bereich">
            <Select
              value={typ}
              onChange={(e) => {
                setTyp(e.target.value as "hersteller" | "generation");
                setWert("");
              }}
            >
              {herstellerScoped ? (
                <option value="hersteller">Hersteller</option>
              ) : null}
              {generationScoped ? (
                <option value="generation">Generation</option>
              ) : null}
            </Select>
          </Field>
          <Field label={typ === "hersteller" ? "Hersteller" : "Generation"}>
            <Select
              value={wert}
              onChange={(e) => setWert(e.target.value)}
              required
            >
              <option value="">— wählen —</option>
              {typ === "hersteller"
                ? hersteller.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))
                : generationen.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
            </Select>
          </Field>
        </div>

        <Textarea
          name="vorlage"
          defaultValue={standard}
          rows={12}
          required
          className="font-mono text-xs"
        />
        <FormFeedback state={state} />
        <Button type="submit" size="sm" disabled={pending || !wert}>
          {pending ? "Speichere…" : "Override anlegen"}
        </Button>
      </form>
    </details>
  );
}
