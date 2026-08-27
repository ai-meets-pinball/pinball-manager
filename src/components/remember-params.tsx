"use client";

import { useEffect } from "react";

/*
  Merkt sich Ansicht-/Filter-Auswahlen (Bereich, Sortierung, Ansicht, …) einer
  Seite in Cookies — damit sie beim Navigieren UND über Sessions hinweg erhalten
  bleiben, statt auf den Default zurückzufallen. Serverseitig gelesen (die
  jeweilige page.tsx via klebrig()), deshalb kein Umschalt-Flackern. Rein
  clientseitig geschrieben; kein Server-Roundtrip, keine DB. `path` grenzt die
  Cookies auf die Seite ein (nur dort mitgeschickt).
*/
export function RememberParams({
  params,
  path = "/",
}: {
  params: Record<string, string>;
  path?: string;
}) {
  const serial = JSON.stringify(params);
  useEffect(() => {
    const obj = JSON.parse(serial) as Record<string, string>;
    for (const [name, value] of Object.entries(obj)) {
      document.cookie = `${name}=${encodeURIComponent(
        value,
      )}; path=${path}; max-age=31536000; samesite=lax`;
    }
  }, [serial, path]);
  return null;
}
