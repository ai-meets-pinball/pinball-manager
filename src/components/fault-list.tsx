import { FehlerZeilenAktionen } from "@/components/fehler-zeilen-aktionen";
import { FotoZoom } from "@/components/ui/foto-zoom";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuelleBadge } from "@/components/ui/quelle-badge";

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
          {fault.bilder && fault.bilder.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fault.bilder.map((url) => (
                <FotoZoom key={url} src={url} alt="Foto zum Fehler" quadrat />
              ))}
            </div>
          ) : null}
        </ListRow>
      ))}
    </List>
  );
}
