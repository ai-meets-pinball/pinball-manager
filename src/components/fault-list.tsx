import Link from "next/link";
import { Wrench } from "lucide-react";
import { FehlerZeilenAktionen } from "@/components/fehler-zeilen-aktionen";
import { FotoZoom } from "@/components/ui/foto-zoom";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuelleBadge } from "@/components/ui/quelle-badge";
import type { Loesung } from "@/lib/loesung";

type Fault = {
  id: string;
  beschreibung: string;
  kategorie: string | null;
  prioritaet: string;
  status: string;
  datum: Date;
  /** Meldeweg (faultSource); "sammel_qr" bekommt ein Kennzeichen. */
  quelle?: string | null;
  melderName?: string | null;
  /** Angehängte Fotos (URLs). */
  bilder?: string[];
  /** Was die verknüpfte Reparatur gemacht hat (lib/loesung.ts). */
  loesung?: Loesung | null;
};

/* Fehler eines Geräts als List/ListRow — der Reiter-Kopf (Filter + ＋ Neuer
   Fehler) rendert die Seite. Die Beschreibung ist der (umbrechende) Titel,
   Fotos liegen im Vollbreiten-Slot darunter. Rechts die Zeilen-Aktionen:
   „Reparatur" als beschrifteter Knopf (die Hauptaktion am Fehler), Stift und
   Papierkorb als Icons. Der KI-Reparaturvorschlag lebt nicht mehr hier,
   sondern auf der Seite „Neue Reparatur" — dort gehört das Formular hin. */
export function FaultList({
  faults,
  machineId,
  schreibbar = true,
}: {
  faults: Fault[];
  machineId: string;
  /** false = nur Lesen: keine Bearbeiten-/Lösch-/Reparatur-Aktionen. */
  schreibbar?: boolean;
}) {
  return (
    <List empty="Keine Fehler erfasst.">
      {faults.map((fault) => (
        <ListRow
          key={fault.id}
          titleWrap
          title={fault.beschreibung}
          subtitle={`${fault.datum.toLocaleDateString("de-DE")}${
            fault.melderName ? ` · ${fault.melderName}` : ""
          }${fault.kategorie ? ` · ${fault.kategorie}` : ""}`}
          meta={
            <>
              <StatusBadge value={fault.status} />
              <StatusBadge value={fault.prioritaet} />
              <QuelleBadge quelle={fault.quelle} />
            </>
          }
          actions={
            schreibbar ? (
              <FehlerZeilenAktionen machineId={machineId} faultId={fault.id} />
            ) : null
          }
        >
          {fault.loesung || (fault.bilder && fault.bilder.length > 0) ? (
            <>
            {/* Die Lösung aus der verknüpften Reparatur — ein Klick führt hin
                (Feedback Dirk 10/2026: „wo ist dann die Lösung?"). */}
            {fault.loesung ? (
              <Link
                href={`/machines/${machineId}/repairs/${fault.loesung.repairId}/edit`}
                className="flex items-start gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              >
                <Wrench size={14} className="mt-0.5 flex-none" />
                <span>
                  <span className="font-medium text-[var(--color-fg)]">
                    {fault.loesung.art === "erledigt" ? "Lösung:" : "Reparatur läuft:"}
                  </span>{" "}
                  {fault.loesung.text || "Reparatur ansehen"}
                </span>
              </Link>
            ) : null}
            {fault.bilder && fault.bilder.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fault.bilder.map((url) => (
                  <FotoZoom key={url} src={url} alt="Foto zum Fehler" quadrat />
                ))}
              </div>
            ) : null}
            </>
          ) : null}
        </ListRow>
      ))}
    </List>
  );
}
