"use client";

import { useEffect, useRef } from "react";

/*
  Klappt das umgebende <details> (z. B. AddDisclosure) zu und setzt das Formular
  zurück, sobald `when` von false auf true wechselt — für „Neu X"-Formulare, die
  nach erfolgreichem Anlegen wieder zugehen sollen. Findet <details>/<form> per
  closest(), wie FormLeaveGuard sein <form> findet; rendert selbst nichts
  Sichtbares.
*/
export function CollapseOnSuccess({ when }: { when: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(when);
  useEffect(() => {
    if (when && !prev.current) {
      const details = ref.current?.closest("details");
      if (details) details.open = false;
      ref.current?.closest("form")?.reset();
    }
    prev.current = when;
  }, [when]);
  return <span ref={ref} className="hidden" aria-hidden />;
}
