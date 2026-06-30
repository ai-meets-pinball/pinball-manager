import { ClubForm } from "@/components/club-form";
import { createClub } from "@/db/actions/clubs";
import { requireUser } from "@/lib/session";

export default async function NewClubPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Neuer Club</h1>
      <p className="text-[var(--color-muted)]">
        Als Ersteller wirst du automatisch Admin.
      </p>
      <ClubForm action={createClub} />
    </div>
  );
}
