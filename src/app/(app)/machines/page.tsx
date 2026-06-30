import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { MachineCard } from "@/components/machine-card";
import { Input } from "@/components/ui/input";
import { getVisibleMachines } from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const machines = await getVisibleMachines(user.id, q);

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

      {machines.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {q
            ? "Keine Maschinen gefunden."
            : "Noch keine Maschinen. Lege deine erste an."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
}
