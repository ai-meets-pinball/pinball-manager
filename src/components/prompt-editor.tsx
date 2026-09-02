"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/input";
import { PromptRefinery } from "@/components/prompt-refinery";
import { resetPrompt, savePrompt } from "@/db/actions/prompts";
import type { FormState } from "@/db/actions/form-state";
import type { AiProvider } from "@/lib/ai/provider";
import { fehlendePlatzhalter } from "@/lib/prompts";
import { Badge } from "@/components/ui/badge";

/*
  Editor für EINEN Prompt-Override (global oder auf einen Hersteller/eine
  Generation begrenzt). Muster wie der E-Mail-Vorlagen-Editor: Textarea +
  Speichern; „Zurücksetzen/Löschen" nur, wenn eine Abweichung gespeichert ist.
  Platzhalter {{…}} MÜSSEN erhalten bleiben. hersteller/generationId reisen als
  hidden inputs mit (leer = nicht beschränkt). Darunter die Refinery (testen/
  verbessern) auf demselben Entwurf.
*/
export function PromptEditor({
  promptKey,
  label,
  platzhalter,
  hersteller = "",
  generationId = "",
  scopeChip = null,
  vorlage,
  existiert,
  providers,
  centralKey,
}: {
  promptKey: string;
  label: string;
  platzhalter: string[];
  hersteller?: string;
  generationId?: string;
  scopeChip?: string | null;
  vorlage: string;
  existiert: boolean;
  providers: AiProvider[];
  centralKey: boolean;
}) {
  const router = useRouter();
  // Controlled, damit die Refinery-Übernahme in die Textarea schreiben kann.
  // Ändert sich `vorlage` serverseitig (nach Speichern/Zurücksetzen), sync per
  // „adjust state during render" (kein setState-in-effect).
  const [text, setText] = useState(vorlage);
  const [prevVorlage, setPrevVorlage] = useState(vorlage);
  if (vorlage !== prevVorlage) {
    setPrevVorlage(vorlage);
    setText(vorlage);
  }

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await savePrompt(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  // Speichern nur, wenn sich etwas geändert hat UND alle Platzhalter da sind —
  // dieselbe Regel, mit der savePrompt ablehnt (lib/prompts.ts).
  const fehlend = fehlendePlatzhalter(text, platzhalter);
  const unveraendert = text === vorlage;
  const sperre =
    fehlend.length > 0
      ? `Platzhalter fehlen: ${fehlend.join(", ")}`
      : unveraendert
        ? "Keine Änderung"
        : null;

  const zeigeBeispielFelder =
    platzhalter.includes("{{hersteller}}") ||
    platzhalter.includes("{{symptom}}");

  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Ein Name (Bereich) + ein Status — statt Label, Chip UND „Standard". */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{scopeChip ?? label}</span>
          {existiert ? (
            <Badge tone="accent">angepasst</Badge>
          ) : (
            <Badge tone="muted">Standard</Badge>
          )}
        </div>
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="key" value={promptKey} />
        <input type="hidden" name="hersteller" value={hersteller} />
        <input type="hidden" name="generationId" value={generationId} />
        <Textarea
          name="vorlage"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          required
          className="font-mono text-xs"
        />
        <FormFeedback state={state} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || sperre !== null}
            title={sperre ?? undefined}
          >
            {pending ? "Speichere…" : "Speichern"}
          </Button>
          {fehlend.length > 0 ? (
            <span className="text-xs text-[var(--color-danger)]">
              Platzhalter fehlen:{" "}
              <span className="font-mono">{fehlend.join(" ")}</span>
            </span>
          ) : null}
        </div>
      </form>

      {/* Zurücksetzen/Löschen als EIGENES Server-Formular. */}
      {existiert ? (
        <form action={resetPrompt}>
          <input type="hidden" name="key" value={promptKey} />
          <input type="hidden" name="hersteller" value={hersteller} />
          <input type="hidden" name="generationId" value={generationId} />
          <ConfirmButton
            question={
              scopeChip
                ? "Diesen Override löschen? Dann greift wieder die allgemeinere Fassung."
                : "Auf den Standard zurücksetzen? Der gespeicherte Prompt wird gelöscht."
            }
            confirmLabel={scopeChip ? "Ja, löschen" : "Ja, zurücksetzen"}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            {scopeChip ? "Override löschen" : "Auf Standard zurücksetzen"}
          </ConfirmButton>
        </form>
      ) : null}

      <PromptRefinery
        promptKey={promptKey}
        text={text}
        zeigeBeispielFelder={zeigeBeispielFelder}
        providers={providers}
        centralKey={centralKey}
        onApply={setText}
      />
    </div>
  );
}
