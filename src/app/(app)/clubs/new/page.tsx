import { ClubForm } from "@/components/club-form";
import { PageHeader } from "@/components/ui/page-header";
import { createClub } from "@/db/actions/clubs";
import { requireUser } from "@/lib/session";

export default async function NewClubPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neuer Club"
        description="Als Ersteller wirst du automatisch Admin."
        backHref="/clubs"
        backLabel="Zu den Clubs"
      />
      <ClubForm action={createClub} />
    </div>
  );
}
