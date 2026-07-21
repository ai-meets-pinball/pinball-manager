import Link from "next/link";
import { Eye, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAllClubs, getUserClubs } from "@/db/queries";
import { isSupporter, requireUser } from "@/lib/session";

export default async function ClubsPage() {
  const user = await requireUser();

  /*
    Rollen kombinieren sich: jemand kann Owner/Mitglied in eigenen Clubs UND
    global Supporter sein. Deshalb ist „Supporter" KEIN exklusiver Modus —
    die eigenen Rollen und „Neuer Club" bleiben erhalten, zusätzlich sieht ein
    Supporter alle übrigen Clubs (nur zur Einsicht).
  */
  const meine = await getUserClubs(user.id);
  const eigeneRolle = new Map(meine.map((c) => [c.id, c.rolle]));
  const supporter = isSupporter(user);

  const clubs = supporter ? await getAllClubs() : meine;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Clubs</h1>
        <Link
          href="/clubs/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] hover:opacity-90"
        >
          <Plus size={16} /> Neuer Club
        </Link>
      </div>

      {clubs.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Du bist noch in keinem Club. Erstelle einen, um Maschinen zu teilen.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {clubs.map((club) => {
            const rolle = eigeneRolle.get(club.id) ?? null;
            return (
              <Link key={club.id} href={`/clubs/${club.id}`}>
                <Card className="flex items-center justify-between transition-colors hover:border-[var(--color-primary)]">
                  <span className="flex items-center gap-2 font-medium">
                    <Users size={16} className="text-[var(--color-primary)]" />
                    {club.name}
                  </span>
                  {rolle ? (
                    <StatusBadge value={rolle} />
                  ) : (
                    // Supporter-Einsicht: kein eigenes Mitglied in diesem Club.
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-faint)]">
                      <Eye size={12} /> Einsicht
                    </span>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
