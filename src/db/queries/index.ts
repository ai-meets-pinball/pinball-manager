/*
  Lesbare, wiederverwendbare Lese-Abfragen — nach Thema getrennt.

  Vorher eine Datei mit 900 Zeilen und 30 Exporten über E-Mail-Vorlagen,
  Clubs, Freigaben, Wissen, Kuratierung, Feedback, Maschinen und Wartung.
  Diese Datei hält die Importe der Aufrufer stabil (`@/db/queries`), die
  Themen liegen daneben.

  Mitgliedschaft = eine club-bezogene Rollenzuweisung (role_assignments.clubId).
*/

/* getUserClubIds liegt in lib/session.ts bei den übrigen Mitgliedschafts-Helfern
   (verhindert den Zyklus queries → sharing → queries) und wird hier nur
   re-exportiert, damit bestehende Importe unverändert funktionieren. */
export { getUserClubIds } from "@/lib/session";

export * from "@/db/queries/machines";
export * from "@/db/queries/maintenance";
export * from "@/db/queries/knowledge";
export * from "@/db/queries/shares";
export * from "@/db/queries/clubs";
export * from "@/db/queries/feedback";
export * from "@/db/queries/settings";
