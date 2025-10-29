import { bookingInclude, serializeBooking } from '@/app/api/bookings/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import {
  AdminPage,
  AdminSection,
  AdminMetric,
  AdminMetricGrid,
} from '@/components/ui/AdminPage';

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
});

const longDate = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric',
});

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type SerializedBooking = ReturnType<typeof serializeBooking>;

type CalendarBooking = {
  id: number;
  propertyName: string;
  guestLabel: string;
  startIso: string;
  endIso: string;
};

type PendingExpense = Awaited<ReturnType<typeof prisma.expense.findMany>>[number] & {
  property: { id: number; name: string };
};

type UpcomingBlackout = Awaited<ReturnType<typeof prisma.blackout.findMany>>[number] & {
  property: { id: number; name: string };
};

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(userError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminOrganizationIds = memberships
    .filter((membership) => membership.role === 'OWNER_ADMIN')
    .map((membership) => membership.organizationId);

  if (adminOrganizationIds.length === 0) {
    return (
      <AdminPage
        title="Owner dashboard"
        description="You’ll see organizations, bookings, and maintenance metrics here once you create your first group."
        actions={
          <Link
            href="/admin/setup"
            className="touch-target rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Go to setup
          </Link>
        }
      >
        <AdminSection title="Get started" description="Create an ownership group to unlock calendar, expenses, and knowledge hub tools.">
          <p className="text-sm text-muted-foreground">
            Once you add your first organization, this dashboard will surface upcoming stays, pending expenses, and active
            maintenance so you can stay ahead.
          </p>
        </AdminSection>
      </AdminPage>
    );
  }

  const organizations = await prisma.organization.findMany({
    where: { id: { in: adminOrganizationIds } },
    orderBy: { name: 'asc' },
    include: {
      properties: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          location: true,
          nightlyRate: true,
          minNights: true,
          ownerships: {
            select: {
              ownerId: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const propertyIds = organizations.flatMap((organization) => organization.properties.map((property) => property.id));
  const ownerMap = new Map<number, { id: number; firstName: string | null; lastName: string | null; email: string }>();

  organizations.forEach((organization) => {
    organization.properties.forEach((property) => {
      property.ownerships.forEach((ownership) => {
        if (ownership.owner) {
          ownerMap.set(ownership.owner.id, {
            id: ownership.owner.id,
            firstName: ownership.owner.firstName ?? null,
            lastName: ownership.owner.lastName ?? null,
            email: ownership.owner.email,
          });
        }
      });
    });
  });

  const now = new Date();
  const calendarMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const calendarGridStart = new Date(calendarMonthStart);
  calendarGridStart.setDate(calendarMonthStart.getDate() - calendarMonthStart.getDay());
  const calendarGridEnd = new Date(calendarGridStart);
  calendarGridEnd.setDate(calendarGridEnd.getDate() + 42);

  const rawApprovedBookings =
    propertyIds.length === 0
      ? []
      : await prisma.booking.findMany({
          where: {
            propertyId: { in: propertyIds },
            status: BookingStatus.approved,
            startDate: { lt: calendarGridEnd },
            endDate: { gt: calendarGridStart },
          },
          orderBy: { startDate: 'asc' },
          include: bookingInclude,
        });

  const approvedBookings: SerializedBooking[] = rawApprovedBookings.map(serializeBooking);

  const bookingsForCalendar: CalendarBooking[] = approvedBookings.map((booking) => {
    const guestLabel = booking.guestName?.trim() || 'Owner stay';
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    return {
      id: booking.id,
      propertyName: booking.property?.name ?? 'Property',
      guestLabel,
      startIso: start.toISOString().slice(0, 10),
      endIso: end.toISOString().slice(0, 10),
    };
  });

  const todayIso = now.toISOString().slice(0, 10);
  const calendarCells: Array<{
    date: Date;
    iso: string;
    inCurrentMonth: boolean;
    isToday: boolean;
    bookings: CalendarBooking[];
  }> = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(calendarGridStart);
    cellDate.setDate(calendarGridStart.getDate() + index);
    const iso = cellDate.toISOString().slice(0, 10);
    const bookings = bookingsForCalendar.filter(
      (booking) => iso >= booking.startIso && iso < booking.endIso,
    );

    return {
      date: cellDate,
      iso,
      inCurrentMonth: cellDate.getMonth() === calendarMonthStart.getMonth(),
      isToday: iso === todayIso,
      bookings,
    };
  });
  const calendarMonthLabel = monthFormatter.format(calendarMonthStart);

  let pendingExpenses: PendingExpense[] = [];
  let upcomingBlackouts: UpcomingBlackout[] = [];

  if (propertyIds.length > 0) {
    [pendingExpenses, upcomingBlackouts] = await Promise.all([
      prisma.expense.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: 'pending',
        },
        orderBy: [{ incurredOn: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        include: {
          property: {
            select: { id: true, name: true },
          },
        },
      }) as Promise<PendingExpense[]>,
      prisma.blackout.findMany({
        where: {
          propertyId: { in: propertyIds },
          endDate: { gte: new Date() },
        },
        orderBy: { startDate: 'asc' },
        take: 5,
        include: {
          property: {
            select: { id: true, name: true },
          },
        },
      }) as Promise<UpcomingBlackout[]>,
    ]);
  }

  const [documents, publishedChecklists] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        description: true,
        version: true,
        updatedAt: true,
      },
    }),
    prisma.checklistVersion.findMany({
      where: { isPublished: true },
      orderBy: [{ publishedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        checklistId: true,
        version: true,
        publishedAt: true,
        checklist: {
          select: {
            category: true,
          },
        },
      },
    }),
  ]);

  const totalPendingExpenseAmount = pendingExpenses.reduce((acc, expense) => acc + expense.amountCents, 0);

  return (
    <AdminPage
      title="Owner dashboard"
      description="Snapshot of organizations, booking readiness, and maintenance work so you can jump straight to what matters."
      actions={
        <Link
          href="/admin/bookings"
          className="touch-target rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Create booking
        </Link>
      }
    >
      <AdminMetricGrid className="md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Organizations" value={organizations.length} />
        <AdminMetric label="Properties" value={propertyIds.length} />
        <AdminMetric label="Owners" value={ownerMap.size} />
        <AdminMetric
          label="Pending expenses"
          value={pendingExpenses.length}
          description={
            pendingExpenses.length ? `${currency.format(totalPendingExpenseAmount / 100)} awaiting approval` : undefined
          }
        />
      </AdminMetricGrid>

      <AdminSection
        title="Approved bookings"
        description="Current month at a glance for every property."
        actions={
          <Link href="/admin/bookings" className="text-sm font-semibold text-accent hover:text-accent-strong">
            Go to bookings
          </Link>
        }
      >
        {propertyIds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-6 text-sm text-muted-foreground">
            Add a property in setup to start tracking stays.
          </div>
        ) : bookingsForCalendar.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-6 text-sm text-muted-foreground">
            No approved bookings for this month yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-foreground">{calendarMonthLabel}</p>
              <p className="text-xs text-muted-foreground">Showing confirmed stays only.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background">
              <table className="w-full min-w-[32rem] divide-y divide-border text-left text-sm text-muted-foreground">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground/80">
                    <th className="py-3 pl-4 pr-3 font-medium text-foreground">Property</th>
                    <th className="py-3 pr-3 font-medium">Owner / Guest</th>
                    <th className="py-3 pr-3 font-medium">Check-in</th>
                    <th className="py-3 pr-4 font-medium">Check-out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {bookingsForCalendar.map((booking) => (
                    <tr key={booking.id} className="transition hover:bg-background-muted">
                      <td className="py-3 pl-4 pr-3 font-medium text-foreground">{booking.propertyName}</td>
                      <td className="py-3 pr-3">{booking.guestLabel}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{longDate.format(new Date(booking.startIso))}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{longDate.format(new Date(booking.endIso))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-border/30 bg-surface px-4 py-4">
              <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {weekdayLabels.map((weekday) => (
                  <div key={weekday}>{weekday}</div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                  const isActive = cell.bookings.length > 0;
                  const containsToday = cell.isToday;
                  const baseClasses =
                    'relative min-h-[5.25rem] rounded-xl border border-transparent px-2 py-2 text-left text-xs transition';
                  const stateClasses = [
                    cell.inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/60',
                    containsToday ? 'ring-1 ring-accent/30 bg-accent/8' : '',
                    isActive
                      ? 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/12'
                      : 'bg-surface hover:bg-background-muted/60',
                    !isActive && !containsToday ? 'border-border/10' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <div key={cell.iso} className={`${baseClasses} ${stateClasses}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{cell.date.getDate()}</span>
                        {containsToday ? (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            Today
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 space-y-1">
                        {cell.bookings.slice(0, 2).map((booking) => (
                          <span
                            key={booking.id}
                            className="block truncate rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-200"
                            title={`${booking.propertyName} · ${booking.guestLabel}`}
                          >
                            {booking.propertyName}
                          </span>
                        ))}
                        {cell.bookings.length > 2 ? (
                          <span className="block text-[10px] text-muted-foreground">
                            +{cell.bookings.length - 2} more
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Organizations & properties"
        description="Quick glance at each group you manage."
        actions={
          <Link href="/admin/setup#properties" className="text-sm font-semibold text-accent hover:text-accent-strong">
            Manage properties
          </Link>
        }
      >
        {organizations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-6 text-sm text-muted-foreground">
            No organizations yet. Create one from the setup page to begin tracking everything in Cottagr.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {organizations.map((organization) => {
              const propertyCount = organization.properties.length;
              const propertySummary = organization.properties.slice(0, 3);
              return (
                <div key={organization.id} className="space-y-4 rounded-2xl border border-border/60 bg-background px-5 py-5 shadow-soft">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{organization.name}</h3>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'}
                      </p>
                    </div>
                    <Link href="/admin/setup#organizations" className="text-sm font-semibold text-accent hover:text-accent-strong">
                      Manage
                    </Link>
                  </header>

                  {propertySummary.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-4 text-sm text-muted-foreground">
                      No properties yet. Add your first cottage to unlock bookings and expenses.
                    </div>
                  ) : (
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {propertySummary.map((property) => {
                        const owners = property.ownerships.map((ownership) => ownership.owner).filter(Boolean);
                        return (
                          <li key={property.id} className="rounded-xl border border-border/60 bg-background px-4 py-4 shadow-soft">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-medium text-foreground">{property.name}</p>
                                <p className="text-xs text-muted-foreground">{property.location ?? 'Location TBD'}</p>
                              </div>
                              <Link
                                href={`/admin/setup?editProperty=${property.id}#properties`}
                                className="text-xs font-semibold text-accent hover:text-accent-strong"
                              >
                                Edit
                              </Link>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-background-muted px-2 py-0.5">
                                Min {property.minNights} night{property.minNights === 1 ? '' : 's'}
                              </span>
                              <span className="rounded-full bg-background-muted px-2 py-0.5">
                                Nightly {currency.format(property.nightlyRate / 100)}
                              </span>
                              <span className="rounded-full bg-background-muted px-2 py-0.5">
                                {owners.length} owner{owners.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection
          title="Outstanding expenses"
          description="Latest pending reimbursements or approvals."
          actions={
            <Link href="/admin/expenses" className="text-sm font-semibold text-accent hover:text-accent-strong">
              Open expenses
            </Link>
          }
          className="h-full"
        >
          {pendingExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-5 text-sm text-muted-foreground">
              No pending expenses right now.
            </div>
          ) : (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {pendingExpenses.map((expense) => (
                <li key={expense.id} className="rounded-xl border border-border/60 bg-background px-4 py-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-foreground">{expense.property.name}</p>
                      <p className="text-xs text-muted-foreground">Incurred {longDate.format(expense.incurredOn)}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {currency.format(expense.amountCents / 100)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Upcoming blackouts"
          description="Maintenance windows or holds on the calendar."
          actions={
            <Link href="/admin/blackouts" className="text-sm font-semibold text-accent hover:text-accent-strong">
              Manage blackouts
            </Link>
          }
          className="h-full"
        >
          {upcomingBlackouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-5 text-sm text-muted-foreground">
              No upcoming blackouts scheduled.
            </div>
          ) : (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {upcomingBlackouts.map((blackout) => (
                <li key={blackout.id} className="rounded-xl border border-border/60 bg-background px-4 py-4 shadow-soft">
                  <p className="text-base font-medium text-foreground">{blackout.property.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {longDate.format(blackout.startDate)} – {longDate.format(blackout.endDate)}
                  </p>
                  {blackout.reason ? <p className="mt-2 text-sm text-muted-foreground">{blackout.reason}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection
          title="Knowledge documents"
          description="Latest files owners rely on in a pinch."
          actions={
            <Link href="/admin/knowledge-hub" className="text-sm font-semibold text-accent hover:text-accent-strong">
              Manage documents
            </Link>
          }
          className="h-full"
        >
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-5 text-sm text-muted-foreground">
              No documents uploaded yet.
            </div>
          ) : (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {documents.map((document) => (
                <li key={document.id} className="rounded-xl border border-border/60 bg-background px-4 py-4 shadow-soft">
                  <p className="text-base font-medium text-foreground">{document.title}</p>
                  <p className="text-xs text-muted-foreground">
                    v{document.version} · Updated {longDate.format(new Date(document.updatedAt))}
                  </p>
                  {document.description ? <p className="mt-2 text-sm text-muted-foreground">{document.description}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Published playbooks"
          description="Checklists currently live for owners."
          actions={
            <Link href="/admin/knowledge-hub" className="text-sm font-semibold text-accent hover:text-accent-strong">
              Review hub
            </Link>
          }
          className="h-full"
        >
          {publishedChecklists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-5 text-sm text-muted-foreground">
              No published checklists yet.
            </div>
          ) : (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {publishedChecklists.map((checklist) => (
                <li key={checklist.id} className="rounded-xl border border-border/60 bg-background px-4 py-4 shadow-soft">
                  <p className="text-base font-medium text-foreground">{checklist.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {checklist.checklist?.category ?? 'General'} · v{checklist.version} · Published{' '}
                    {checklist.publishedAt ? longDate.format(new Date(checklist.publishedAt)) : 'recently'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>
    </AdminPage>
  );
}
