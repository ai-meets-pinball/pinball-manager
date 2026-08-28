"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/*
  Kleiner Info-Aufklapper: ein Icon-Knopf öffnet ein Popover mit dem Erklärtext —
  hält Formulare kompakt, die Langtexte stecken dahinter. Schließt bei Außenklick
  und Escape. Vorbild/Geschwister: RoleInfo (role-info.tsx).
*/
export function InfoPopover({
  children,
  label = "Erklärung",
  align = "left",
}: {
  children: ReactNode;
  /** aria-label / title des Knopfes. */
  label?: string;
  /** Ausrichtung des Popovers relativ zum Knopf. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`inline-flex items-center rounded-full p-0.5 transition-colors ${
          open
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        }`}
      >
        <Info size={14} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-50 mt-1 max-h-[60vh] w-72 space-y-2 overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left text-xs leading-snug text-[var(--color-muted)] shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
