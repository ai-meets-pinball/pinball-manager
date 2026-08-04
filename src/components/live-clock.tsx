"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/*
  Live-Uhr für die Maschinen-Kopfzeile (Dashboard-Optik): aktuelle Uhrzeit +
  Datum, tickt jede Sekunde. Hydration-Guard: bis zum Mount ein Platzhalter,
  danach die echte Zeit — sonst weicht Server- von Client-Render ab.
*/
export function LiveClock() {
  const [jetzt, setJetzt] = useState<Date | null>(null);

  useEffect(() => {
    setJetzt(new Date());
    const id = setInterval(() => setJetzt(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[var(--color-muted)]">
      <Clock size={16} />
      <div className="text-right leading-tight">
        <div className="font-mono text-sm tabular-nums">
          {jetzt ? jetzt.toLocaleTimeString("de-DE") : "--:--:--"}
        </div>
        <div className="text-xs">
          {jetzt
            ? jetzt.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : " "}
        </div>
      </div>
    </div>
  );
}
