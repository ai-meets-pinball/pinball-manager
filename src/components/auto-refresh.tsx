"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
  Lädt die Server-Component-Daten der aktuellen Seite periodisch neu
  (router.refresh) — für Live-Ansichten wie das Dashboard im Turniermodus, damit
  ein neu gemeldeter Fehler den Alarm ohne manuelles Neuladen auslöst. Rendert
  nichts; nur mounten, wenn das Polling gewünscht ist.
*/
export function AutoRefresh({ intervalMs = 25000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
