"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { LinksFeld } from "@/components/links-feld";
import { updateKnowledge } from "@/db/actions/knowledge";
import { parseFactsText } from "@/lib/import-facts";
import { leseTippInhalt, type TippLink } from "@/lib/tipp-inhalt";
import { troubleshootingGuideSchema } from "@/lib/validators";
import { wissenUnveraendert } from "@/lib/wissen-aenderung";
import type { FormState } from "@/db/actions/form-state";

/*
  Editor für einen EIGENEN Wissenseintrag (Phase 5): ein Stift im Kopf des
  Eintrags öffnet den Dialog (natives <dialog>, nur gemountet solange offen —
  jede Öffnung startet mit frischem Zustand). Bewusst kein struktureller
  Tabellen-Editor: Titel als Textfeld, Inhalt als JSON-Textarea mit „Prüfen"-
  Schleife — Fakten laufen durch dieselbe parseFactsText wie der Import, Guides
  durch troubleshootingGuideSchema. Gespeichert wird erst nach erfolgreicher
  Prüfung UND nur, wenn sich etwas vom gespeicherten Stand unterscheidet
  (wissenUnveraendert); jede Textänderung invalidiert die Prüfung. Der alte
  Stand landet serverseitig im Verlauf.

  Bei Guides ist `inhalt` NUR der guide-Teil — der Umschlag (websuche, model)
  bleibt serverseitig erhalten und ist nicht editierbar.

  Tipps (typ='tipp') sind freier Text statt JSON — dort entfällt die
  Prüf-Schleife; ihre Links werden über LinksFeld mitbearbeitet.
*/
type Typ = "handbuch_fakten" | "troubleshooting" | "tipp";
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
  typ: Typ;
  titel: string;
  inhalt: unknown;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label="Bearbeiten"
        title="Bearbeiten"
        className={ICON_BTN}
      >
        <Pencil size={14} />
      </button>
      {offen ? (
        <EditorDialog
          knowledgeId={knowledgeId}
          machineId={machineId}
          typ={typ}
          titel={titel}
          inhalt={inhalt}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

function EditorDialog({
  knowledgeId,
  machineId,
  typ,
  titel: titelAusgang,
  inhalt,
  onClose,
}: {
  knowledgeId: string;
  machineId: string;
  typ: Typ;
  titel: string;
  inhalt: unknown;
  onClose: () => void;
}) {
  const router = useRouter();
  // Tipps: Text und Links getrennt (Links über LinksFeld); sonst JSON-Textarea.
  const tippInhalt = typ === "tipp" ? leseTippInhalt(inhalt) : null;
  const ausgang = {
    titel: titelAusgang,
    inhalt: tippInhalt ? tippInhalt.text : JSON.stringify(inhalt, null, 2),
    links: tippInhalt?.links ?? [],
  };
  const [titel, setTitel] = useState(ausgang.titel);
  const [json, setJson] = useState(ausgang.inhalt);
  const [links, setLinks] = useState<TippLink[]>(ausgang.links);
  const [check, setCheck] = useState<Pruefung | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await updateKnowledge(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  const unveraendert = wissenUnveraendert(ausgang, { titel, inhalt: json, links });

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
    <ActionDialog onClose={onClose} ok={Boolean(state.message)} breit>
      <form action={formAction} className="space-y-3 p-5">
        <h3 className="text-base font-semibold">Eintrag bearbeiten</h3>
        <input type="hidden" name="knowledgeId" value={knowledgeId} />
        <input type="hidden" name="machineId" value={machineId} />
        <Field label="Titel">
          <Input
            name="titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            required
          />
        </Field>
        <Field
          label={
            typ === "handbuch_fakten"
              ? "Fakten (JSON)"
              : typ === "troubleshooting"
                ? "Guide (JSON)"
                : "Text"
          }
          hint={
            typ === "handbuch_fakten"
              ? "Struktur wie beim JSON-Import: { coils: { columns, rows }, … }"
              : typ === "troubleshooting"
                ? "Nur der Guide selbst — Websuche-/Modell-Angaben bleiben erhalten."
                : "Formatierung: **fett**, _kursiv_, Aufzählung mit Bindestrich am Zeilenanfang, [Text](https://…)."
          }
        >
          <Textarea
            name="inhalt"
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setCheck(null); // nach Änderung erneut prüfen
            }}
            rows={typ === "tipp" ? 6 : 12}
            className={typ === "tipp" ? undefined : "font-mono text-xs"}
          />
        </Field>
        {/* Tipps: weiterführende Links mit-bearbeiten (sonst gingen sie beim
            Speichern verloren, da sie im selben inhalt-JSON stecken). */}
        {tippInhalt ? (
          <LinksFeld defaultLinks={tippInhalt.links} onChange={setLinks} />
        ) : null}
        <Field label="Kommentar zur Änderung (optional)">
          <Input
            name="kommentar"
            placeholder="z. B. Tippfehler in der Spulen-Tabelle korrigiert"
          />
        </Field>

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

        <div className="flex flex-wrap items-center justify-end gap-2">
          <DialogAbbrechen />
          {typ !== "tipp" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={pruefen}
              disabled={!json.trim()}
            >
              Prüfen
            </Button>
          ) : null}
          {/* JSON-Typen: Speichern erst nach erfolgreicher Prüfung; alle Typen:
              erst, wenn sich etwas vom gespeicherten Stand unterscheidet. */}
          <Button
            type="submit"
            size="sm"
            disabled={
              pending ||
              unveraendert ||
              (typ === "tipp" ? !json.trim() : !check?.ok)
            }
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {pending ? "Speichere…" : "Speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
