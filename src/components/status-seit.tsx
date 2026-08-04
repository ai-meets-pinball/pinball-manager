"use client";

import { useEffect, useState } from "react";

/*
  Uptime-Ticker „Seit HH:MM:SS" — zählt hoch, seit der Status zuletzt gewechselt
  hat (machines.statusSeit). Ab 24 h mit Tage-Präfix. Hydration-Guard wie bei
  der Live-Uhr.
*/
function formatDauer(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const tage = Math.floor(s / 86_400);
  const std = Math.floor((s % 86_400) / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  const zz = (n: number) => String(n).padStart(2, "0");
  const uhr = `${zz(std)}:${zz(min)}:${zz(sek)}`;
  return tage > 0 ? `${tage} T ${uhr}` : uhr;
}

export function StatusSeit({ seit }: { seit: string }) {
  const [dauer, setDauer] = useState<string | null>(null);

  useEffect(() => {
    const start = new Date(seit).getTime();
    const tick = () => setDauer(formatDauer(Date.now() - start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [seit]);

  return (
    <span className="font-mono tabular-nums">Seit {dauer ?? "--:--:--"}</span>
  );
}
