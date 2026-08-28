import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getUserClubs } from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function ClubsPage() {
  const user = await requireUser();
  const clubs = await getUserClubs(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs"
        actions={
          <ButtonLink href="/clubs/new">
            <Plus size={16} /> Neuer Club
          </ButtonLink>
        }
      />

      {clubs.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Du bist noch in keinem Club. Erstelle einen, um Maschinen zu teilen.
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
                <StatusBadge value={club.rolle} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
