import { Spinner } from "@/components/ui/spinner";

/*
  Sofortiges Feedback bei jeder Navigation im angemeldeten Bereich: Next zeigt
  diese Datei, sobald ein Link/Reiter/Sortier- oder Blätter-Link geklickt wurde
  und die neue Seite noch lädt — Nav und Chrome aus dem Layout bleiben stehen,
  nur der Inhalt wird ersetzt (Feedback 09/2026).
*/
export default function Loading() {
  return (
    <div className="flex justify-center py-16 text-[var(--color-muted)]">
      <Spinner size={24} label="Lädt …" />
    </div>
  );
}
