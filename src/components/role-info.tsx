"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/*
  Erklärt die verfügbaren Rollen dort, wo man sie vergibt — hinter einem
  Info-Icon, damit die Formulare schlank bleiben. Die Rollen kommen aus dem
  `roles`-Katalog (DB), nicht aus fest verdrahtetem Text.
*/

export type RoleInfoItem = {
  key: string;
  label: string;
  beschreibung: string | null;
  scope?: string;
  rang?: number;
};

export function RoleInfo({
  roles,
  titel = "Was bedeuten die Rollen?",
}: {
  roles: RoleInfoItem[];
  titel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (roles.length === 0) return null;

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={titel}
        title={titel}
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
          aria-label={titel}
          className="absolute left-0 top-full z-50 mt-1 w-72 space-y-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-lg"
        >
          <p className="text-xs font-semibold">{titel}</p>
          {roles.map((r) => (
            <div key={r.key}>
              <p className="text-xs font-medium text-[var(--color-fg)]">
                {r.label}{" "}
                <span className="font-mono text-[10px] text-[var(--color-faint)]">
                  {r.key}
                </span>
              </p>
              {r.beschreibung ? (
                <p className="text-xs leading-snug text-[var(--color-muted)]">
                  {r.beschreibung}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </span>
  );
}
