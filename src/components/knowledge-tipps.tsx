"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  Globe,
  LayoutGrid,
  Layers,
  List as ListIcon,
  Lock,
  Tag,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormatierterText } from "@/components/ui/formatted-text";
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
  (aufklappbare Zeilen). Die Wahl merkt sich der Browser (localStorage).
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

const ANSICHT_KEY = "tipps-ansicht";

export function KnowledgeTipps({
  eintraege,
  currentUserId,
  machineId,
  kannKuratieren = false,
}: {
  eintraege: Eintrag[];
  currentUserId: string;
  machineId: string;
  /** Kurator/Super-Admin: darf Einträge für alle verbergen/wiederherstellen. */
  kannKuratieren?: boolean;
}) {
  // Ansicht merken (hydrationssicher: SSR nutzt die Vorgabe, nach dem Mount
  // wird geladen — dasselbe Muster wie im QR-Druck-Studio).
  const [ansicht, setAnsicht] = useState<"karten" | "liste">("karten");
  const [geladen, setGeladen] = useState(false);
  useEffect(() => {
    const v = localStorage.getItem(ANSICHT_KEY);
    if (v === "karten" || v === "liste") setAnsicht(v);
    setGeladen(true);
  }, []);
  useEffect(() => {
    if (geladen) localStorage.setItem(ANSICHT_KEY, ansicht);
  }, [geladen, ansicht]);

  if (eintraege.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Für dieses Modell liegen dir gegenüber noch keine Tipps vor.
      </p>
    );
  }

  // Der Meta-Kopf (Herkunft, Sichtbarkeit, Signale, Moderation) — in beiden
  // Ansichten identisch.
  const kopf = (e: Eintrag, eigen: boolean, S: (typeof SICHT)[Sicht]) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-[var(--color-muted)]">
        {eigen ? "Dein Tipp" : `Geteilt von ${e.autorName ?? "unbekannt"}`}
        {" · "}
        <span className="inline-flex items-center gap-1">
          <S.Icon size={13} /> {S.label}
        </span>
      </p>
      <div className="flex items-center gap-3">
        <KnowledgeSignals
          knowledgeId={e.id}
          machineId={machineId}
          hilfreich={e.hilfreich}
          falsch={e.falsch}
          meinSignal={e.meinSignal}
          eigen={eigen}
        />
        {eigen ? (
          <SetVisibility
            knowledgeId={e.id}
            machineId={machineId}
            current={e.visibility}
          />
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

  // Der Inhalt unter dem Kopf: Text, Links, Geltungsbereich, Autor-Steuerung.
  const koerper = (e: Eintrag, eigen: boolean) => {
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

        {eigen ? (
          <div className="space-y-2">
            <KnowledgeEdit
              knowledgeId={e.id}
              machineId={machineId}
              typ="tipp"
              titel={e.titel}
              inhalt={e.inhalt}
            />
            <div className="flex flex-wrap items-center gap-3">
              <KnowledgeVerlauf
                knowledgeId={e.id}
                anzahl={e.revisionen}
                typ="tipp"
              />
              <form action={deleteTipp}>
                <input type="hidden" name="knowledgeId" value={e.id} />
                <input type="hidden" name="machineId" value={machineId} />
                <ConfirmButton
                  question="Tipp für alle Ziele löschen?"
                  confirmLabel="Ja, löschen"
                  className="text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                >
                  Löschen
                </ConfirmButton>
              </form>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const knopf = (
    wert: "karten" | "liste",
    Icon: typeof Globe,
    titel: string,
  ) => (
    <button
      type="button"
      onClick={() => setAnsicht(wert)}
      aria-pressed={ansicht === wert}
      aria-label={titel}
      title={titel}
      className={`rounded-[var(--radius)] border p-1.5 ${
        ansicht === wert
          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      }`}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1" aria-label="Ansicht">
        {knopf("karten", LayoutGrid, "Kartenansicht")}
        {knopf("liste", ListIcon, "Listenansicht")}
      </div>

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
                {koerper(e, eigen)}
              </div>
            </details>
          );
        }

        return (
          <Card key={e.id} className="space-y-3">
            {kopf(e, eigen, S)}
            <div className="space-y-1">
              <h3 className="font-semibold">{e.titel}</h3>
            </div>
            {koerper(e, eigen)}
          </Card>
        );
      })}
    </div>
  );
}
