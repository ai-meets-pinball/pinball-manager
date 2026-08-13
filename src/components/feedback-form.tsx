"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import { submitFeedback, updateFeedback } from "@/db/actions/feedback";
import type { FormState } from "@/db/actions/form-state";

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
  - FeedbackBearbeiten: Inline-Triage je Meldung (Status + Antwort) — wird nur
    für Super-Admins gerendert; die Action prüft das zusätzlich.
*/

function ScreenshotFeld() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [datei, setDatei] = useState<File | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [ueberZone, setUeberZone] = useState(false);

  function uebernehmen(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    // In den echten File-Input legen — so reist die Datei im Form-Submit mit.
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
    setDatei(file);
  }

  function entfernen() {
    if (inputRef.current) inputRef.current.value = "";
    setDatei(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setUeberZone(false);
    uebernehmen(e.dataTransfer.files?.[0] ?? null);
  }

  // Strg/Cmd+V: ein Bild in der Zwischenablage landet direkt im Feld.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const bild = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      if (bild) uebernehmen(bild.getAsFile());
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // Vorschau-URL verwalten (und wieder freigeben).
  useEffect(() => {
    if (!datei) {
      setVorschau(null);
      return;
    }
    const url = URL.createObjectURL(datei);
    setVorschau(url);
    return () => URL.revokeObjectURL(url);
  }, [datei]);

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

export function FeedbackBearbeiten({
  id,
  status,
  antwort,
}: {
  id: string;
  status: string;
  antwort: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await updateFeedback(prev, fd);
      if (res.message) router.refresh();
      return res;
    },
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      <input type="hidden" name="id" value={id} />
      <Select name="status" defaultValue={status} className="w-auto py-1 text-xs">
        <option value="offen">offen</option>
        <option value="in Arbeit">in Arbeit</option>
        <option value="erledigt">erledigt</option>
        <option value="zurückgestellt">zurückgestellt</option>
        <option value="verworfen">verworfen</option>
      </Select>
      <Input
        name="antwort"
        defaultValue={antwort ?? ""}
        placeholder="Antwort an den Melder (optional)"
        className="w-64 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Speichern"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}
