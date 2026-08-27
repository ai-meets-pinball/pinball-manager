"use client";

import { useEffect } from "react";

/*
  Merkt sich die zuletzt gewählte Bereichs-Auswahl (Alle/Privat/Club) der
  Maschinenliste in einem Cookie — damit sie beim Navigieren UND über Sessions
  hinweg erhalten bleibt, statt bei jedem Besuch auf „Alle" zurückzufallen. Das
  Cookie wird serverseitig gelesen (machines/page), deshalb entsteht beim Laden
  kein Umschalt-Flackern. Rein clientseitig geschrieben; kein Server-Roundtrip,
  keine DB. path=/machines: wird nur bei Maschinen-Requests mitgeschickt.
*/
export function RememberScope({
  value,
  name = "machinesScope",
}: {
  value: string;
  name?: string;
}) {
  useEffect(() => {
    document.cookie = `${name}=${encodeURIComponent(
      value,
    )}; path=/machines; max-age=31536000; samesite=lax`;
  }, [value, name]);
  return null;
}
