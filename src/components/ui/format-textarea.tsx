"use client";

import { useRef, useState, type TextareaHTMLAttributes } from "react";
import { Bold, Eye, Italic, Link2, List, Pencil } from "lucide-react";
import { FormatierterText } from "@/components/ui/formatted-text";
import { Textarea } from "@/components/ui/input";

/*
  Textfeld mit Basis-Formatierung (Redlining 2026-09-13): eine kleine Leiste
  setzt die Markdown-Zeichen, die lib/mini-markdown versteht — fett, kursiv,
  Aufzählung, Link — um die aktuelle Auswahl bzw. an die Cursor-Position, und
  eine Vorschau rendert den Text mit DEMSELBEN Renderer wie die Anzeige
  (FormatierterText). Kein WYSIWYG, kein HTML: gespeichert wird weiter der
  reine Text, wie bisher.

  Gesteuert oder ungesteuert: mit `value`/`onChange` hält der Aufrufer den
  Text; sonst startet das Feld bei `defaultValue` und trägt den Wert selbst
  (der <textarea name=…> geht wie gewohnt mit dem Formular).
*/
type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value?: string;
  onChange?: (wert: string) => void;
};

export function FormatTextarea({ value, onChange, defaultValue, className = "", ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [intern, setIntern] = useState(String(defaultValue ?? ""));
  const [vorschau, setVorschau] = useState(false);
  const text = value ?? intern;

  function setze(neu: string, cursor?: number) {
    setIntern(neu);
    onChange?.(neu);
    if (cursor !== undefined) {
      // Nach dem React-Update den Cursor hinter das Eingefügte setzen.
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    }
  }

  /** Auswahl mit Zeichen umschließen (oder Platzhalter einfügen). */
  function umschliessen(vor: string, nach: string, platzhalter: string) {
    const el = ref.current;
    const a = el?.selectionStart ?? text.length;
    const b = el?.selectionEnd ?? text.length;
    const auswahl = text.slice(a, b) || platzhalter;
    const neu = text.slice(0, a) + vor + auswahl + nach + text.slice(b);
    setze(neu, a + vor.length + auswahl.length + nach.length);
  }

  /** Jede Zeile der Auswahl zur Aufzählung machen (oder eine neue beginnen). */
  function liste() {
    const el = ref.current;
    const a = el?.selectionStart ?? text.length;
    const b = el?.selectionEnd ?? text.length;
    const zeilenStart = text.lastIndexOf("\n", a - 1) + 1;
    const block = text.slice(zeilenStart, b);
    const neuBlock = (block || "Punkt")
      .split("\n")
      .map((z) => (z.startsWith("- ") ? z : `- ${z}`))
      .join("\n");
    const neu = text.slice(0, zeilenStart) + neuBlock + text.slice(b);
    setze(neu, zeilenStart + neuBlock.length);
  }

  function link() {
    const el = ref.current;
    const a = el?.selectionStart ?? text.length;
    const b = el?.selectionEnd ?? text.length;
    const auswahl = text.slice(a, b) || "Linktext";
    const einsatz = `[${auswahl}](https://)`;
    const neu = text.slice(0, a) + einsatz + text.slice(b);
    // Cursor in die URL, damit sie direkt getippt werden kann.
    setze(neu, a + einsatz.length - 1);
  }

  const knopf =
    "inline-flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)-2px)] text-[var(--color-muted)] hover:bg-[var(--color-inset)] hover:text-[var(--color-fg)]";

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={knopf} title="Fett (**Text**)" aria-label="Fett" onClick={() => umschliessen("**", "**", "fett")} disabled={vorschau}>
          <Bold size={15} />
        </button>
        <button type="button" className={knopf} title="Kursiv (_Text_)" aria-label="Kursiv" onClick={() => umschliessen("_", "_", "kursiv")} disabled={vorschau}>
          <Italic size={15} />
        </button>
        <button type="button" className={knopf} title="Aufzählung (- Punkt)" aria-label="Aufzählung" onClick={liste} disabled={vorschau}>
          <List size={15} />
        </button>
        <button type="button" className={knopf} title="Link ([Text](https://…))" aria-label="Link" onClick={link} disabled={vorschau}>
          <Link2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => setVorschau((v) => !v)}
          aria-pressed={vorschau}
          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
            vorschau
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          }`}
        >
          {vorschau ? <Pencil size={12} /> : <Eye size={12} />}
          {vorschau ? "Bearbeiten" : "Vorschau"}
        </button>
      </div>
      {vorschau ? (
        <div className="min-h-24 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] px-3 py-2">
          {text.trim() ? (
            <FormatierterText text={text} />
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Noch kein Text.</p>
          )}
        </div>
      ) : null}
      {/* Das Feld bleibt auch in der Vorschau im DOM (nur versteckt), damit
          Wert und `name` weiter mit dem Formular gehen. */}
      <Textarea
        ref={ref}
        {...rest}
        value={text}
        onChange={(e) => setze(e.target.value)}
        className={vorschau ? "hidden" : ""}
      />
    </div>
  );
}
