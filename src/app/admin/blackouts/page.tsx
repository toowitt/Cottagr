
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { prisma } from '@/lib/prisma';
import { createBlackout, deleteBlackout } from './actions';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default async function AdminBlackoutsPage() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader
        title="Blackout management"
        description="Create blackout periods to block booking requests during maintenance windows or personal stays."
        primaryAction={
          <span className="touch-target rounded-full border border-default px-4 py-2 text-sm font-semibold text-foreground">
            Sync calendar
          </span>
        }
      />

      <Container padding="md" className="space-y-10 py-10">
        <section className="rounded-3xl border border-default bg-background px-6 py-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground">Add blackout</h2>
          <form action={createBlackout} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Property
              </span>
              <select
                name="propertyId"
                required
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Select a property…</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Start date
              </span>
              <input
                type="date"
                name="startDate"
                required
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>

            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                End date
              </span>
              <input
                type="date"
                name="endDate"
                required
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>

            <label className="md:col-span-2 text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reason (optional)
              </span>
              <input
                type="text"
                name="reason"
                placeholder="e.g., Maintenance, personal stay"
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full rounded-full bg-danger px-5 py-3 text-sm font-semibold text-background shadow-soft transition hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
              >
                Create blackout
              </button>
            </div>
          </form>
        </section>

        <BlackoutsList />
      </Container>
    </>
  );
}

async function BlackoutsList() {
  const blackouts = await prisma.blackout.findMany({
    include: {
      property: { select: { name: true } },
    },
    orderBy: [{ startDate: 'desc' }],
  });

  if (blackouts.length === 0) {
    return (
      <section className="rounded-3xl border border-default bg-background px-6 py-6 text-sm text-muted-foreground shadow-soft">
        No blackouts scheduled yet. Create one above to reserve time for maintenance or personal stays.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {blackouts.map((blackout) => (
        <article
          key={blackout.id}
          className="flex flex-col gap-4 rounded-3xl border border-default bg-background px-6 py-4 shadow-soft md:flex-row md:items-start md:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{blackout.property.name}</p>
            <p className="text-sm text-muted-foreground">
              {dateFormatter.format(blackout.startDate)} — {dateFormatter.format(blackout.endDate)}
            </p>
            {blackout.reason ? (
              <p className="mt-2 text-xs text-muted-foreground">Reason: {blackout.reason}</p>
            ) : null}
          </div>

          <form action={deleteBlackout} className="flex justify-end md:ml-4">
            <input type="hidden" name="id" value={blackout.id} />
            <button
              type="submit"
              className="touch-target rounded-full border border-danger/40 px-4 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            >
              Delete
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}
