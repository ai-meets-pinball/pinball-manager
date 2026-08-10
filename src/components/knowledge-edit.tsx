"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { updateKnowledge } from "@/db/actions/knowledge";
import { parseFactsText } from "@/lib/import-facts";
import { troubleshootingGuideSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  In-Place-Editor für einen EIGENEN Wissenseintrag (Phase 5). Bewusst kein
  struktureller Tabellen-Editor: Titel als Textfeld, Inhalt als JSON-Textarea
  mit „Prüfen"-Schleife — Fakten laufen durch dieselbe parseFactsText wie
  der Import, Guides durch troubleshootingGuideSchema. Gespeichert wird erst
  nach erfolgreicher Prüfung; jede Textänderung invalidiert sie (Muster von
  ManualJsonImport). Der alte Stand landet serverseitig im Verlauf.

  Bei Guides ist `inhalt` NUR der guide-Teil — der Umschlag (websuche, model)
  bleibt serverseitig erhalten und ist nicht editierbar.
*/
type Pruefung = { ok: boolean; meldungen: string[] };

export function KnowledgeEdit({
  knowledgeId,
  machineId,
  typ,
  titel,
  inhalt,
}: {
  knowledgeId: string;
  /** "" auf der Modellseite — dann sorgt router.refresh() für die Aktualisierung. */
  machineId: string;
  typ: "handbuch_fakten" | "troubleshooting";
  titel: string;
  inhalt: unknown;
}) {
  const router = useRouter();
  const [json, setJson] = useState(() => JSON.stringify(inhalt, null, 2));
  const [check, setCheck] = useState<Pruefung | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await updateKnowledge(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  function pruefen() {
    if (typ === "handbuch_fakten") {
      const r = parseFactsText(json);
      setCheck(
        r.ok
          ? {
              ok: true,
              meldungen: [
                `✓ ${r.present.length} Tabelle(n) gültig.`,
                ...r.warnings,
              ],
            }
          : { ok: false, meldungen: r.errors },
      );
      return;
    }
    try {
      const parsed = troubleshootingGuideSchema.safeParse(JSON.parse(json));
      setCheck(
        parsed.success
          ? { ok: true, meldungen: ["✓ Guide-Struktur gültig."] }
          : {
              ok: false,
              meldungen: [
                `Ungültige Guide-Struktur: ${parsed.error.issues[0]?.message ?? "unbekannt"}`,
              ],
            },
      );
    } catch {
      setCheck({ ok: false, meldungen: ["Kein gültiges JSON."] });
    }
  }

  return (
    <details className="rounded-[var(--radius)] border border-[var(--color-border)]">
      <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <Pencil size={14} /> Bearbeiten
      </summary>
      <form action={formAction} className="space-y-3 border-t border-[var(--color-border)] p-3">
        <input type="hidden" name="knowledgeId" value={knowledgeId} />
        <input type="hidden" name="machineId" value={machineId} />
        <Field label="Titel">
          <Input name="titel" defaultValue={titel} required />
        </Field>
        <Field
          label={typ === "handbuch_fakten" ? "Fakten (JSON)" : "Guide (JSON)"}
          hint={
            typ === "handbuch_fakten"
              ? "Struktur wie beim JSON-Import: { coils: { columns, rows }, … }"
              : "Nur der Guide selbst — Websuche-/Modell-Angaben bleiben erhalten."
          }
        >
          <Textarea
            name="inhalt"
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setCheck(null); // nach Änderung erneut prüfen
            }}
            rows={12}
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Kommentar zur Änderung (optional)">
          <Input name="kommentar" placeholder="z. B. Tippfehler in der Spulen-Tabelle korrigiert" />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={pruefen}
            disabled={!json.trim()}
          >
            Prüfen
          </Button>
          {/* Speichern erst nach erfolgreicher Prüfung. */}
          <Button type="submit" disabled={pending || !check?.ok}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {pending ? "Speichere…" : "Speichern"}
          </Button>
        </div>

        {check ? (
          <ul
            className={`list-disc pl-5 text-sm ${
              check.ok
                ? "text-[var(--color-muted)]"
                : "text-[var(--color-danger)]"
            }`}
          >
            {check.meldungen.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : null}
        <FormFeedback state={state} />
      </form>
    </details>
  );
}
