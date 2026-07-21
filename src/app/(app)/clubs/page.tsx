import Link from "next/link";
import { Eye, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAllClubs, getUserClubs } from "@/db/queries";
import { isSupporter, requireUser } from "@/lib/session";

export default async function ClubsPage() {
  const user = await requireUser();

  // Supporter sehen ALLE Clubs (nur lesend), normale Nutzer nur ihre eigenen.
  const nurAufsicht = isSupporter(user);
  const clubs = nurAufsicht
    ? await getAllClubs()
    : await getUserClubs(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Clubs</h1>
        {nurAufsicht ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)]">
            <Eye size={13} /> Supporter · nur Einsicht
          </span>
        ) : (
          <Link
            href="/clubs/new"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] hover:opacity-90"
          >
            <Plus size={16} /> Neuer Club
          </Link>
        )}
      </div>

      {clubs.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {nurAufsicht
            ? "Es gibt noch keine Clubs."
            : "Du bist noch in keinem Club. Erstelle einen, um Maschinen zu teilen."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {clubs.map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-[var(--color-primary)]">
                <span className="flex items-center gap-2 font-medium">
                  <Users size={16} className="text-[var(--color-primary)]" />
                  {club.name}
                </span>
                {club.rolle ? <StatusBadge value={club.rolle} /> : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
