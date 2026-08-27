import { STATUS_LABEL } from "@/lib/betriebsstatus";
import { Badge, type BadgeTone } from "@/components/ui/badge";

/*
  Status-/Prioritäts-Chip, einheitlich für Fehler, Reparaturen & Rollen. Dünner
  Wrapper über `Badge` (badge.tsx): bildet den Enum-Wert auf einen semantischen
  Ton ab und liefert das deutsche Label. So gibt es EINEN Pillen-Stil.
*/
const tone: Record<string, BadgeTone> = {
  // Fehler-Status
  offen: "warn",
  quittiert: "muted",
  "in Arbeit": "accent",
  behoben: "success",
  // Reparatur-Status
  erledigt: "success",
  // Feedback-Status (zusätzlich zu offen/in Arbeit/erledigt oben)
  zurückgestellt: "muted",
  verworfen: "danger",
  // Priorität (Fehler: niedrig/mittel/hoch; Wartung zusätzlich sehr hoch/kritisch)
  niedrig: "muted",
  mittel: "warn",
  hoch: "danger",
  "sehr hoch": "danger",
  kritisch: "danger",
  // Rollen (Clubs)
  owner: "primary",
  admin: "accent",
  member: "muted",
  // Globale Rolle
  superadmin: "primary",
  kurator: "success",
  // Maschinen-Betriebsstatus (Dashboard)
  spielbereit: "success",
  eingeschraenkt: "warn",
  ausser_betrieb: "danger",
  // Maschinen-Herkunft (Admin-Sichtbarkeitsansicht)
  eigene: "primary",
  Club: "accent",
};

/** Anzeigenamen für Enum-Werte, die nicht schon deutsch sind. */
export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Mitglied",
  // Betriebsstatus kommt aus lib/betriebsstatus.ts — eine Quelle für Badge,
  // Auswahlfeld und Übersicht.
  ...STATUS_LABEL,
};

export function StatusBadge({ value }: { value: string }) {
  // Enum-Werte (Rollen, Status) auf deutsche Labels abbilden; alles andere
  // (Fehler-/Reparatur-Status) ist bereits deutsch und bleibt unverändert.
  const label = ROLE_LABEL[value] ?? value;
  return <Badge tone={tone[value] ?? "muted"}>{label}</Badge>;
}
