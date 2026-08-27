"use client";

import { useActionState, useState } from "react";
import { FileText, Link as LinkIcon, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormLeaveGuard } from "@/components/ui/form-leave-guard";
import type { FormState } from "@/db/actions/form-state";

export type DokumentArt = "link" | "notiz" | "datei";

type DokumentValues = {
  id: string;
  typ: DokumentArt;
  titel: string;
  notiz: string | null;
  url: string | null;
  dateiname: string | null;
};

const ARTEN = [
  { wert: "link", label: "Link", icon: LinkIcon },
  { wert: "notiz", label: "Notiz", icon: StickyNote },
  { wert: "datei", label: "Datei", icon: FileText },
] as const;

const fileInputStyles =
  "w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--color-inset)] file:px-3 file:py-1 file:text-[var(--color-fg)] focus:border-[var(--color-primary)]";

/* Anlegen/Bearbeiten eines Dokuments (Link / Notiz / Datei) — Vorbild
   TerminForm. Ein Formular für alle drei Arten: der Art-Umschalter blendet die
   passenden Felder ein. Beim Bearbeiten ist die Art fix (die Zeile bleibt, was
   sie ist); eine Datei kann optional ersetzt werden. */
export function DokumentForm({
  action,
  machineId,
  dokument,
  defaultArt = "link",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  machineId: string;
  dokument?: DokumentValues;
  defaultArt?: DokumentArt;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const bearbeiten = Boolean(dokument);
  const [art, setArt] = useState<DokumentArt>(dokument?.typ ?? defaultArt);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="machineId" value={machineId} />
      {dokument ? <input type="hidden" name="id" value={dokument.id} /> : null}
      <input type="hidden" name="typ" value={art} />

      {/* Art-Auswahl nur beim Anlegen — beim Bearbeiten bleibt der Typ fix. */}
      {bearbeiten ? (
        <p className="text-sm text-[var(--color-muted)]">
          Art: {ARTEN.find((a) => a.wert === art)?.label}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ARTEN.map(({ wert, label, icon: Icon }) => {
            const aktiv = art === wert;
            return (
              <button
                key={wert}
                type="button"
                onClick={() => setArt(wert)}
                className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-sm transition-colors ${
                  aktiv
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-fg)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-inset)]"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            );
          })}
        </div>
      )}

      <Field label="Titel">
        <Input
          name="titel"
          required
          placeholder={
            art === "link"
              ? "z. B. OPDB-Eintrag"
              : art === "datei"
                ? "z. B. Kassenbon Netzteil"
                : "z. B. Einstellungen DIP-Schalter"
          }
          defaultValue={dokument?.titel ?? ""}
        />
      </Field>

      {art === "link" ? (
        <Field
          label="Web-Adresse (URL)"
          hint="z. B. Link zum OPDB-Eintrag, einem Video oder Datenblatt."
        >
          <Input
            name="url"
            required
            placeholder="https://…"
            defaultValue={dokument?.url ?? ""}
          />
        </Field>
      ) : null}

      {art === "datei" ? (
        <>
          <Field
            label={bearbeiten ? "Datei ersetzen (optional)" : "Datei"}
            hint="PDF, Bild (JPG/PNG/WebP/GIF/AVIF), DOCX/XLSX/PPTX, TXT/CSV — max. 25 MB."
          >
            <input
              type="file"
              name="datei"
              required={!bearbeiten}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.avif,.docx,.xlsx,.pptx,.txt,.csv,application/pdf,image/*"
              className={fileInputStyles}
            />
          </Field>
          {bearbeiten && dokument?.dateiname ? (
            <p className="text-xs text-[var(--color-muted)]">
              Aktuell: {dokument.dateiname}
            </p>
          ) : null}
          <label className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
            <input
              type="checkbox"
              name="attest"
              required={!bearbeiten}
              className="mt-0.5 accent-[var(--color-accent)]"
            />
            <span>
              Ich bestätige, dass ich diese Datei speichern darf. Handbücher bitte
              über »Handbuch«/»Guide« einlesen — sie werden hier nicht abgelegt.
            </span>
          </label>
        </>
      ) : null}

      <Field label={art === "notiz" ? "Notiz" : "Notiz (optional)"}>
        <Textarea
          name="notiz"
          required={art === "notiz"}
          placeholder={
            art === "notiz" ? "Freier Text…" : "Optionale Beschreibung…"
          }
          defaultValue={dokument?.notiz ?? ""}
        />
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
        <FormLeaveGuard backHref={`/machines/${machineId}?bereich=dokumente`} />
      </div>
    </form>
  );
}
