import {
  ChevronRight,
  ExternalLink,
  Globe,
  Layers,
  Lock,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormatierterText } from "@/components/ui/formatted-text";
import { ICON_BTN } from "@/components/ui/icon-button";
import { KnowledgeEdit } from "@/components/knowledge-edit";
import { KnowledgeGemeldet } from "@/components/knowledge-gemeldet";
import { KnowledgeHide } from "@/components/knowledge-hide";
import { KnowledgeVerlauf } from "@/components/knowledge-verlauf";
import {
  KnowledgeVerbergen,
  KnowledgeVerborgen,
} from "@/components/knowledge-moderation";
import { KnowledgeSignals } from "@/components/knowledge-signals";
import { SetVisibility } from "@/components/set-visibility";
import { deleteTipp } from "@/db/actions/tipps";
import { leseTippInhalt } from "@/lib/tipp-inhalt";

/*
  Allgemeine Tipps (typ='tipp') als MODELL-Wissen: formatierter Text (Basis-
  Markdown, siehe FormatierterText) plus optionale weiterführende Links, gültig
  für ein oder mehrere Modelle und/oder Generationen (n:m in `knowledge_targets`).
  Anders als Fakten/Guides sind Tipps viele kleine Einträge — daher zwei
  Ansichten: gestapelte KARTEN (alles offen) oder eine kompakte LISTE
  (aufklappbare Zeilen). Die Ansicht kommt von der Seite (URL-Parameter
  `ansicht` + Cookie via klebrig/ViewToggle, wie im Admin) — die Komponente
  selbst hält keinen Zustand und bleibt eine Server-Komponente.
*/
type Sicht = "privat" | "club" | "oeffentlich";

type Eintrag = {
  id: string;
  titel: string;
  inhalt: unknown;
  visibility: Sicht;
  sourceType: string;
  createdAt: Date;
  autorId: string;
  autorName: string | null;
  hilfreich: number;
  falsch: number;
  meinSignal: "hilfreich" | "falsch" | null;
  ausgeblendet: boolean;
  verborgenAm: Date | null;
  verborgenGrund: string | null;
  verborgenVonName: string | null;
  revisionen: number;
  /** Namen aller Ziel-Modelle bzw. -Generationen dieses Tipps. */
  zielModelle: string[];
  zielGenerationen: string[];
};

const SICHT: Record<Sicht, { label: string; Icon: typeof Globe }> = {
  privat: { label: "privat", Icon: Lock },
  club: { label: "Club", Icon: Users },
  oeffentlich: { label: "öffentlich", Icon: Globe },
};

export function KnowledgeTipps({
  eintraege,
  currentUserId,
  machineId,
  kannKuratieren = false,
  ansicht = "karten",
}: {
  eintraege: Eintrag[];
  currentUserId: string;
  machineId: string;
  /** Kurator/Super-Admin: darf Einträge für alle verbergen/wiederherstellen. */
  kannKuratieren?: boolean;
  /** Karten (alles offen) oder kompakte Liste — von der Seite aus URL/Cookie gelesen. */
  ansicht?: "karten" | "liste";
}) {
  if (eintraege.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Für dieses Modell liegen dir gegenüber noch keine Tipps vor.
      </p>
    );
  }

  // Der Meta-Kopf: Herkunft links; rechts Signale, dann die Autor-Aktionen
  // (Sichtbarkeit speichert beim Ändern, Verlauf-Link, Stift → Dialog,
  // Papierkorb mit Rückfrage) bzw. „Ausblenden" für Fremde — in beiden
  // Ansichten identisch. Die Sichtbarkeit steht bei eigenen Einträgen nur im
  // Auswahlfeld (keine Doppelanzeige).
  const kopf = (e: Eintrag, eigen: boolean, S: (typeof SICHT)[Sicht]) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-[var(--color-muted)]">
        {eigen ? (
          "Dein Tipp"
        ) : (
          <>
            Geteilt von {e.autorName ?? "unbekannt"}
            {" · "}
            <span className="inline-flex items-center gap-1">
              <S.Icon size={13} /> {S.label}
            </span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <KnowledgeSignals
          knowledgeId={e.id}
          machineId={machineId}
          hilfreich={e.hilfreich}
          falsch={e.falsch}
          meinSignal={e.meinSignal}
          eigen={eigen}
        />
        {eigen ? (
          <>
            <SetVisibility
              knowledgeId={e.id}
              machineId={machineId}
              current={e.visibility}
            />
            <KnowledgeVerlauf
              knowledgeId={e.id}
              anzahl={e.revisionen}
              typ="tipp"
            />
            <span className="flex items-center">
              <KnowledgeEdit
                knowledgeId={e.id}
                machineId={machineId}
                typ="tipp"
                titel={e.titel}
                inhalt={e.inhalt}
              />
              <ActionForm action={deleteTipp} className="flex items-center gap-2">
                <input type="hidden" name="knowledgeId" value={e.id} />
                <input type="hidden" name="machineId" value={machineId} />
                <ConfirmButton
                  question="Tipp für alle Ziele löschen? Bewertungen und Verlauf gehen mit."
                  confirmLabel="Ja, löschen"
                  aria-label="Tipp löschen"
                  title="Tipp löschen"
                  className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
                >
                  <Trash2 size={14} />
                </ConfirmButton>
              </ActionForm>
            </span>
          </>
        ) : (
          <KnowledgeHide
            knowledgeId={e.id}
            machineId={machineId}
            ausgeblendet={false}
            titel={e.titel}
          />
        )}
        {kannKuratieren && !e.verborgenAm ? (
          <KnowledgeVerbergen knowledgeId={e.id} machineId={machineId} />
        ) : null}
      </div>
    </div>
  );

  // Der Inhalt unter dem Kopf: Text, Links, Geltungsbereich.
  const koerper = (e: Eintrag) => {
    const { text, links } = leseTippInhalt(e.inhalt);
    return (
      <>
        {e.verborgenAm ? (
          <KnowledgeVerborgen
            knowledgeId={e.id}
            machineId={machineId}
            grund={e.verborgenGrund}
            vonName={e.verborgenVonName}
            am={e.verborgenAm}
            kannKuratieren={kannKuratieren}
          />
        ) : null}
        <KnowledgeGemeldet hilfreich={e.hilfreich} falsch={e.falsch} />

        <FormatierterText text={text} />

        {links.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {links.map((l, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <ExternalLink
                  size={13}
                  className="mt-0.5 flex-none text-[var(--color-muted)]"
                  aria-hidden
                />
                <span className="min-w-0">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="break-words font-medium text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
                  >
                    {l.name || l.url}
                  </a>
                  {l.beschreibung ? (
                    <span className="text-[var(--color-muted)]">
                      {" "}
                      — {l.beschreibung}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Geltungsbereich: alle Ziele des Tipps. */}
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-1">
            <Tag size={12} /> gilt für:
          </span>
          {e.zielGenerationen.map((g) => (
            <span
              key={`g-${g}`}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5"
            >
              <Layers size={11} /> {g}
            </span>
          ))}
          {e.zielModelle.map((m) => (
            <span
              key={`m-${m}`}
              className="rounded-full border border-[var(--color-border)] px-2 py-0.5"
            >
              {m}
            </span>
          ))}
        </p>
      </>
    );
  };

  return (
    <div className="space-y-3">
      {eintraege.map((e) => {
        const eigen = e.autorId === currentUserId;
        // Fremd + für mich ausgeblendet (aber nicht kuratiert verborgen):
        // in beiden Ansichten der schlanke Wieder-Einblenden-Hinweis.
        if (!eigen && e.ausgeblendet && !e.verborgenAm) {
          return (
            <KnowledgeHide
              key={e.id}
              knowledgeId={e.id}
              machineId={machineId}
              ausgeblendet
              titel={e.titel}
            />
          );
        }
        const S = SICHT[e.visibility];

        if (ansicht === "liste") {
          return (
            <details
              key={e.id}
              className="group rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
                <ChevronRight
                  size={14}
                  className="flex-none text-[var(--color-muted)] transition-transform group-open:rotate-90"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {e.titel}
                </span>
                <span className="inline-flex flex-none items-center gap-1 text-xs text-[var(--color-muted)]">
                  <S.Icon size={12} /> {S.label}
                </span>
              </summary>
              <div className="space-y-3 border-t border-[var(--color-border)] p-3">
                {kopf(e, eigen, S)}
                {koerper(e)}
              </div>
            </details>
          );
        }

        return (
          <Card key={e.id} className="space-y-3">
            {kopf(e, eigen, S)}
            <h3 className="font-semibold">{e.titel}</h3>
            {koerper(e)}
          </Card>
        );
      })}
    </div>
  );
}
