"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Send, X } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { submitFeedback, updateFeedback } from "@/db/actions/feedback";
import type { FormState } from "@/db/actions/form-state";
import { FEEDBACK_STATUS_LABEL } from "@/lib/feedback-status";
import { FEEDBACK_STATUS } from "@/lib/validators";

/*
  Feedback-Formulare (Client-Inseln der /feedback-Seite):
  - FeedbackForm: neue Meldung (Typ, Titel, Beschreibung, optionaler
    Screenshot). Seite/App-Version/Browser ergänzt der SERVER — hier reist nur
    der Herkunfts-Pfad (?von=…) als verstecktes Feld mit.
  - ScreenshotFeld: Drop-Zone für den Screenshot — Klick (Dateiauswahl),
    Hineinziehen ODER einfach Strg/Cmd+V irgendwo auf der Seite (der Paste-
    Listener greift nur bei BILDERN in der Zwischenablage und stört Text-
    Eingaben nicht). Die Datei landet in einem echten <input type="file">,
    damit sie im normalen Form-Submit mitreist.
  - FeedbackBearbeiten: Stift-Icon je Meldung, das den Dialog „Meldung
    bearbeiten" (Status + Antwort) öffnet — wird nur für Super-Admins
    gerendert; die Action prüft das zusätzlich.
*/

function ScreenshotFeld() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [datei, setDatei] = useState<File | null>(null);
  const [ueberZone, setUeberZone] = useState(false);
  // Vorschau-URL wird im Handler erzeugt und dort auch wieder freigegeben —
  // kein Nebeneffekt beim Rendern (StrictMode würde sonst eine URL je Datei leaken).
  const [vorschau, setVorschau] = useState<string | null>(null);
  function vorschauSetzen(file: File | null) {
    setVorschau((alt) => {
      if (alt) URL.revokeObjectURL(alt);
      return file ? URL.createObjectURL(file) : null;
    });
  }
  useEffect(() => () => vorschauSetzen(null), []);

  function uebernehmen(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    // In den echten File-Input legen — so reist die Datei im Form-Submit mit.
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
    setDatei(file);
    vorschauSetzen(file);
  }

  function entfernen() {
    if (inputRef.current) inputRef.current.value = "";
    setDatei(null);
    vorschauSetzen(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setUeberZone(false);
    uebernehmen(e.dataTransfer.files?.[0] ?? null);
  }

  // Strg/Cmd+V: ein Bild in der Zwischenablage landet direkt im Feld. Der
  // Listener hängt einmal am Dokument; die Ref zeigt immer auf den aktuellen Handler.
  const uebernehmenRef = useRef(uebernehmen);
  useEffect(() => {
    uebernehmenRef.current = uebernehmen;
  });
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const bild = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      if (bild) uebernehmenRef.current(bild.getAsFile());
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);


  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name="screenshot"
        accept="image/*"
        className="hidden"
        onChange={(e) => uebernehmen(e.target.files?.[0] ?? null)}
      />
      {datei ? (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-2">
          {vorschau ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vorschau}
              alt="Screenshot-Vorschau"
              className="h-14 w-20 flex-none rounded-[4px] object-cover"
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted)]">
            {datei.name || "Eingefügtes Bild"} ·{" "}
            {Math.max(1, Math.round(datei.size / 1024))} KB
          </span>
          <button
            type="button"
            onClick={entfernen}
            title="Screenshot entfernen"
            className="flex-none text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setUeberZone(true);
          }}
          onDragLeave={() => setUeberZone(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed px-3 py-5 text-sm transition-colors ${
            ueberZone
              ? "border-[var(--color-primary)] bg-[var(--color-inset)] text-[var(--color-fg)]"
              : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
          }`}
        >
          <ImagePlus size={16} />
          Bild hierher ziehen, einfügen (Strg+V) oder klicken
        </div>
      )}
    </div>
  );
}

export function FeedbackForm({ von }: { von: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // Nach Erfolg das Screenshot-Feld über den key neu mounten (leert Vorschau).
  const [resetMarke, setResetMarke] = useState(0);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await submitFeedback(prev, fd);
      if (res.message) {
        formRef.current?.reset();
        setResetMarke((n) => n + 1);
        router.refresh();
      }
      return res;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="seite" value={von} />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Typ">
          <Select name="typ" defaultValue="fehler">
            <option value="fehler">Fehler</option>
            <option value="verbesserung">Verbesserungsvorschlag</option>
          </Select>
        </Field>
        <Field label="Titel">
          <Input
            name="titel"
            required
            placeholder="Kurz gesagt: was ist das Problem bzw. der Wunsch?"
          />
        </Field>
      </div>
      <Field
        label="Beschreibung"
        hint="Bei Fehlern hilft: Was hast du getan, was hast du erwartet, was ist passiert?"
      >
        <Textarea name="beschreibung" required rows={4} />
      </Field>
      {/* Bewusst KEIN <Field> (= <label>): ein Label um den File-Input würde
          den Datei-Dialog beim Klick auf die Zone doppelt öffnen. */}
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Screenshot (optional)</span>
        <ScreenshotFeld key={resetMarke} />
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        Seite, App-Version und Browser werden automatisch mitgeschickt.
      </p>
      <FormFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        {pending ? "Sende…" : "Meldung absenden"}
      </Button>
    </form>
  );
}

/*
  Status und Antwort gehören zusammen: ein Abschluss-Status löst die Mail an den
  Melder aus, und die Antwort ist ihr Text. Deshalb EIN Dialog für beides statt
  eines Selects, das beim Ändern sofort speichert. Nur gemountet, solange offen
  (siehe ActionDialog); Speichern erst, wenn sich etwas vom gespeicherten Stand
  unterscheidet (P2).
*/
export function FeedbackBearbeiten({
  id,
  status,
  antwort,
}: {
  id: string;
  status: string;
  antwort: string | null;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label="Meldung bearbeiten"
        title="Status und Antwort bearbeiten"
        className={ICON_BTN}
      >
        <Pencil size={14} />
      </button>
      {offen ? (
        <FeedbackDialog
          id={id}
          status={status}
          antwort={antwort ?? ""}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

function FeedbackDialog({
  id,
  status: gespeicherterStatus,
  antwort: gespeicherteAntwort,
  onClose,
}: {
  id: string;
  status: string;
  antwort: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateFeedback,
    {},
  );
  const [status, setStatus] = useState(gespeicherterStatus);
  const [antwort, setAntwort] = useState(gespeicherteAntwort);
  const unveraendert =
    status === gespeicherterStatus &&
    antwort.trim() === gespeicherteAntwort.trim();

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={formAction} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Meldung bearbeiten</h3>
        <input type="hidden" name="id" value={id} />
        <Field label="Status">
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {FEEDBACK_STATUS.map((s) => (
              <option key={s} value={s}>
                {FEEDBACK_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Antwort an den Melder"
          hint={
            "Sichtbar unter „Meine Meldungen\"; bei einem Abschluss-Status geht sie per E-Mail mit."
          }
        >
          <Textarea
            name="antwort"
            rows={3}
            value={antwort}
            onChange={(e) => setAntwort(e.target.value)}
            placeholder="Antwort an den Melder (optional)"
          />
        </Field>
        <FormFeedback state={state} />
        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || unveraendert}>
            {pending ? "…" : "Speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
