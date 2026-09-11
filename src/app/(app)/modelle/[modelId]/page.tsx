import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KnowledgeFacts } from "@/components/knowledge-facts";
import { KnowledgeGuides } from "@/components/knowledge-guides";
import { KnowledgeTipps } from "@/components/knowledge-tipps";
import { MachineTabs, type MachineTab } from "@/components/machine-tabs";
import { SharedRepairs } from "@/components/shared-repairs";
import { Card } from "@/components/ui/card";
import {
  getFamilie,
  getMachineModel,
  getModelGuides,
  getModelKnowledge,
  getModelTipps,
  getSharedRepairsForModel,
} from "@/db/queries";
import { kannKuratieren, requireUser } from "@/lib/session";
import { modellName } from "@/lib/format";

/*
  Typ-Seite (die Klasse, z. B. „Monster Bash"): zeigt das für diesen Nutzer
  sichtbare Wissen (knowledge, Modell-Ebene) + geteilte Reparaturen —
  unabhängig davon, ob er selbst eine Instanz besitzt. Eigene Wissenseinträge
  lassen sich hier in der Sichtbarkeit ändern.

  Wie die Maschinen-Detailseite in Reiter gegliedert (?bereich=…, MachineTabs):
  Handbuch-Daten · Guide · Reparaturen sind so ohne Scrollen direkt erreichbar,
  jeder Reiter mit Bestandszahl — auch (0).
*/
export default async function GeraetetypPage({
  params,
  searchParams,
}: {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ bereich?: string }>;
}) {
  const [{ modelId }, { bereich }] = await Promise.all([params, searchParams]);
  const currentUser = await requireUser();

  const model = await getMachineModel(modelId);
  if (!model) notFound();

  // Familie: baugleiche Editionen (LE/Premium) — deren Wissen zählt hier mit.
  const [fakten, guides, tipps, reparaturen, familie] = await Promise.all([
    getModelKnowledge(currentUser, modelId),
    getModelGuides(currentUser, modelId),
    getModelTipps(currentUser, modelId),
    getSharedRepairsForModel(currentUser, modelId),
    getFamilie(modelId),
  ]);

  // Alle Bereiche bekommen einen Reiter samt Bestandszahl — auch mit (0),
  // damit ohne Klick sichtbar ist, wo (noch) nichts liegt.
  const bereiche = [
    { key: "handbuch", label: "Handbuch-Daten", anzahl: fakten.length },
    { key: "guide", label: "Troubleshooting-Guide", anzahl: guides.length },
    { key: "tipps", label: "Tipps", anzahl: tipps.length },
    { key: "reparaturen", label: "Reparaturen", anzahl: reparaturen.length },
  ];

  /*
    Auf dieser Seite wird nichts angelegt — jeder Einstieg dazu sitzt an der
    eigenen MASCHINE dieses Modells (Handbuch auswerten, Guide erzeugen, Tipp
    schreiben, Reparatur freigeben). Weil das Wissen aber am MODELL hängt und
    für alle gilt, ist die häufigste offene Frage hier: „lohnt sich ein
    zweiter Eintrag?" — und die Antwort ist je Bereich verschieden. Deshalb
    ein Satz je Reiter statt eines allgemeinen Hinweises.

    ACHTUNG beim Formulieren: GELTUNGSBEREICH und SICHTBARKEIT sind zwei
    getrennte Achsen (CONTEXT.md). „Gilt fürs ganze Modell" heißt NICHT „sehen
    alle" — Tipps etwa stehen zunächst auf privat. Diese Sätze haben das schon
    einmal verwechselt.
  */
  const hinweise: Record<string, string> = {
    handbuch:
      "Handbuch-Daten hängen am MODELL, nicht an der einzelnen Maschine — wer sie zu sehen bekommt, entscheidet davon unabhängig die Sichtbarkeit des Eintrags. Ein weiteres Handbuch wertest du an deiner eigenen Maschine dieses Modells aus; nötig ist das nur, wenn im vorhandenen Auszug Tabellen fehlen.",
    guide:
      "Ein Guide gilt ebenfalls fürs ganze Modell; wer ihn sieht, steuert die Sichtbarkeit am Eintrag. An deiner eigenen Maschine lässt sich ein weiterer erzeugen oder ein fertiger als JSON einspielen — nötig ist das nur, wenn der vorhandene etwas Wesentliches übergeht.",
    tipps:
      "Tipps schreibst du an deiner eigenen Maschine dieses Modells. Sie stehen zunächst auf privat — andere sehen sie erst, wenn du sie öffentlich stellst. Anders als beim Handbuch-Auszug ergänzen sich mehrere Tipps, hier lohnt sich ein weiterer fast immer.",
    reparaturen:
      "Hier stehen Reparaturen, die andere für dieses Modell freigegeben haben. Eigene kommen dazu, indem du sie an deiner Maschine dokumentierst und anschließend freigibst — je mehr Wege zu einem Fehler dokumentiert sind, desto besser.",
  };
  const leer = bereiche.every((b) => b.anzahl === 0);

  const active =
    bereich && bereiche.some((b) => b.key === bereich) ? bereich : "handbuch";

  const tabs: MachineTab[] = bereiche.map((b) => ({
    key: b.key,
    label: `${b.label} (${b.anzahl})`,
    href: `/modelle/${modelId}?bereich=${b.key}`,
    active: b.key === active,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/modelle"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft size={14} /> Wissensbasis
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        {model.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.imageUrl}
            alt={modellName(model)}
            className="h-20 w-32 flex-none rounded-[var(--radius)] object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold">{modellName(model)}</h1>
          <p className="text-[var(--color-muted)]">
            {model.baujahr ?? "Baujahr unbekannt"} · Modell
            {familie.geschwister.length > 0 ? (
              <>
                {" · Baugleich mit: "}
                {familie.geschwister.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 ? ", " : ""}
                    <Link
                      href={`/modelle/${g.id}`}
                      className="hover:underline"
                      title={g.opdbRef}
                    >
                      {g.modell}
                    </Link>
                  </span>
                ))}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {leer ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Für dieses Modell ist dir gegenüber noch kein Wissen sichtbar.
            Sobald jemand Handbuch-Daten oder Reparaturen freigibt, erscheinen
            sie hier.
          </p>
        </Card>
      ) : (
        <>
          <MachineTabs primary={tabs} />

          {hinweise[active] ? (
            <p className="max-w-3xl text-[13px] leading-[1.6] text-[var(--color-muted)]">
              {hinweise[active]}
            </p>
          ) : null}

          {active === "handbuch" ? (
            <KnowledgeFacts
              eintraege={fakten}
              currentUserId={currentUser.id}
              machineId=""
              kannKuratieren={kannKuratieren(currentUser)}
            />
          ) : null}
          {active === "guide" ? (
            guides.length > 0 ? (
              <KnowledgeGuides
                eintraege={guides}
                currentUserId={currentUser.id}
                machineId=""
                kannKuratieren={kannKuratieren(currentUser)}
              />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Für dieses Modell ist dir gegenüber noch kein
                Troubleshooting-Guide sichtbar.
              </p>
            )
          ) : null}
          {active === "tipps" ? (
            <KnowledgeTipps
              eintraege={tipps}
              currentUserId={currentUser.id}
              machineId=""
              kannKuratieren={kannKuratieren(currentUser)}
            />
          ) : null}
          {active === "reparaturen" ? (
            reparaturen.length > 0 ? (
              <SharedRepairs eintraege={reparaturen} />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Für dieses Modell sind dir gegenüber noch keine Reparaturen
                freigegeben.
              </p>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
