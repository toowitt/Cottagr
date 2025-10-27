
import { PageHeader } from '@/components/ui/PageHeader';
import { Container } from '@/components/ui/Container';

export default function AdminCalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Unified view of bookings, blackouts, and availability across every property. Calendar tooling is coming soon."
      />

      <Container padding="md" className="py-10">
        <div className="rounded-3xl border border-dashed border-default bg-background-muted px-6 py-16 text-center shadow-soft">
          <div className="text-6xl mb-6">📅</div>
          <h2 className="text-xl font-semibold text-foreground">Availability calendar</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Calendar view for managing property availability and bookings is in progress. Meanwhile, use the bookings
            list to approve, adjust, or review stays.
          </p>
        </div>
      </Container>
    </>
  );
}
