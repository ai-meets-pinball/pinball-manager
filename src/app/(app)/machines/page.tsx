import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { MachinesBoard } from "@/components/machines-board";
import { Input } from "@/components/ui/input";
import {
  getDueMaintenanceCountByMachine,
  getUserClubs,
  getVisibleMachines,
} from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const machines = await getVisibleMachines(user.id, q);
  // Fällige Wartungen je Maschine — für die „N fällig"-Badge auf den Karten.
  const wartungFaellig = await getDueMaintenanceCountByMachine(
    machines.map((m) => m.id),
  );
  // Clubs des Nutzers — Ziele für die Bulk-Zuweisung.
  const meineClubs = await getUserClubs(user.id);

  const items = machines.map((m) => ({
    id: m.id,
    hersteller: m.hersteller,
    modell: m.modell,
    baujahr: m.baujahr,
    fotoUrl: m.fotoUrl,
    clubId: m.clubId,
    club: m.club,
    wartungFaellig: wartungFaellig.get(m.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Maschinen</h1>
        <Link
          href="/machines/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] hover:opacity-90"
        >
          <Plus size={16} /> Neue Maschine
        </Link>
      </div>

      {/* Suche: GET-Formular aktualisiert die URL — Filterung passiert server-seitig. */}
      <form className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Hersteller oder Modell suchen…"
          className="pl-9"
        />
      </form>

      {items.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {q
            ? "Keine Maschinen gefunden."
            : "Noch keine Maschinen. Lege deine erste an."}
        </p>
      ) : (
        <MachinesBoard
          machines={items}
          clubs={meineClubs.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
