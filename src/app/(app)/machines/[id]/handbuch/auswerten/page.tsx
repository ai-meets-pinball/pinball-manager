import { ManualExtract } from "@/components/manual-extract";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getKiZugang } from "@/db/queries";
import { availableProviders } from "@/lib/ai/provider";
import { modellName } from "@/lib/format";
import { requireMachineWrite } from "@/lib/session";

/*
  „Handbuch auswerten" als eigene Seite statt als Dialog (Redlining
  2026-09-13): der Prompt-Weg hat Anleitung, Prompt, Einfügefeld, Prüfung
  und Tipps — das ist zu viel für ein Modal, und beim Wechsel in den KI-Chat
  und zurück ist eine Seite mit eigener URL robuster. Die Zutaten sind
  dieselben wie auf der Detailseite (Anbieter, Plattform-Schlüssel, Regel aus
  lib/ki-zugang); nach dem Import zeigt der Handbuch-Reiter die Fakten.
*/
export default async function HandbuchAuswertenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { machine, user } = await requireMachineWrite(id);

  const ki = await getKiZugang(user);
  const kiHandbuch = ki.handbuch;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Handbuch auswerten · ${modellName(machine)}`}
        backHref={`/machines/${id}?bereich=handbuch`}
        backLabel="Zum Handbuch-Reiter"
      />
      <Card className="space-y-4">
        <ManualExtract
          machineId={machine.id}
          providers={availableProviders()}
          centralKey={Boolean(process.env.ANTHROPIC_API_KEY)}
          byoErlaubt={ki.byo}
          appErlaubt={kiHandbuch.erlaubt}
          appGrund={kiHandbuch.erlaubt ? undefined : kiHandbuch.grund}
        />
      </Card>
    </div>
  );
}
