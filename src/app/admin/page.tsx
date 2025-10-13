import { bookingInclude, serializeBooking } from '@/app/api/bookings/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';

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
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Owner dashboard</h1>
          <p className="text-sm text-slate-300">
            You&apos;ll see a summary of organizations, properties, expenses, and maintenance here once you create
            your first organization.
          </p>
        </header>

        <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-sm text-emerald-100">
          <h2 className="text-lg font-semibold text-emerald-200">Get started</h2>
          <p className="mt-2">Create an ownership group to unlock calendar, expenses, and knowledge hub tools.</p>
          <Link
            href="/admin/setup"
            className="mt-4 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Go to setup
          </Link>
        </div>
      </div>
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

  // serialize bookings returned from Prisma
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
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Owner dashboard</h1>
        <p className="text-sm text-slate-300">
          Snapshot of your organizations, booking readiness, and maintenance work so you can jump straight to
          what matters.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Organizations" value={organizations.length} href="/admin/setup#organizations" />
        <DashboardStat label="Properties" value={propertyIds.length} href="/admin/setup#properties" />
        <DashboardStat label="Owners" value={ownerMap.size} href="/admin/setup#owners" />
        <DashboardStat
          label="Pending expenses"
          value={pendingExpenses.length}
          href="/admin/expenses"
          hint={pendingExpenses.length ? currency.format(totalPendingExpenseAmount / 100) : undefined}
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Approved bookings</h2>
            <p className="text-sm text-slate-400">Current month at a glance for every property.</p>
          </div>
          <Link href="/admin/bookings" className="text-sm text-emerald-300 hover:text-emerald-200">
            Go to bookings
          </Link>
        </header>

        {propertyIds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            Add a property in setup to start tracking stays.
          </p>
        ) : bookingsForCalendar.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No approved bookings for this month yet.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-white">{calendarMonthLabel}</p>
              <p className="text-xs text-slate-400">Showing confirmed stays only.</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="grid grid-cols-7 bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
                {weekdayLabels.map((weekday) => (
                  <div key={weekday} className="px-3 py-2 text-center">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map((cell) => {
                  const hasBookings = cell.bookings.length > 0;
                  const cellClasses = [
                    'min-h-[7.5rem] border border-slate-800 p-2 text-xs transition',
                    cell.inCurrentMonth ? 'bg-slate-950/60 text-slate-200' : 'bg-slate-950/20 text-slate-500',
                    cell.isToday ? 'ring-2 ring-emerald-400' : '',
                  ].join(' ');

                  return (
                    <div key={cell.iso} className={cellClasses}>
                      <div className="flex items-center justify-between text-white">
                        <span className="text-sm font-semibold">{cell.date.getDate()}</span>
                        {hasBookings ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                            Booked
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-1">
                        {cell.bookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] text-white"
                          >
                            <p className="font-medium">{booking.guestLabel}</p>
                            <p className="text-[10px] text-emerald-100">{booking.propertyName}</p>
                          </div>
                        ))}
                        {cell.bookings.length > 3 ? (
                          <p className="text-[10px] text-slate-300">
                            +{cell.bookings.length - 3} more
                          </p>
                        ) : null}
                        {!hasBookings ? (
                          <p className="text-[10px] text-slate-500">Available</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Organizations &amp; properties</h2>
            <p className="text-sm text-slate-400">Quick glance at each group you manage.</p>
          </div>
          <Link href="/admin/setup#properties" className="text-sm text-emerald-300 hover:text-emerald-200">
            Manage properties
          </Link>
        </header>

        {organizations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No organizations yet. Create one from the setup page to begin tracking everything in Cottagr.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {organizations.map((organization) => {
              const propertyCount = organization.properties.length;
              const propertySummary = organization.properties.slice(0, 3);
              return (
                <article key={organization.id} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{organization.name}</h3>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        {propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'}
                      </p>
                    </div>
                    <Link href="/admin/setup#organizations" className="text-sm text-emerald-300 hover:text-emerald-200">
                      Manage
                    </Link>
                  </header>

                  {propertySummary.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
                      No properties yet. Add your first cottage to unlock bookings and expenses.
                    </p>
                  ) : (
                    <ul className="space-y-3 text-sm text-slate-200">
                      {propertySummary.map((property) => {
                        const owners = property.ownerships.map((ownership) => ownership.owner).filter(Boolean);
                        return (
                          <li key={property.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-medium text-white">{property.name}</p>
                                <p className="text-xs text-slate-400">{property.location ?? 'Location TBD'}</p>
                              </div>
                              <Link
                                href={`/admin/setup?editProperty=${property.id}#properties`}
                                className="text-xs text-emerald-300 hover:text-emerald-200"
                              >
                                Edit
                              </Link>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                Min {property.minNights} night{property.minNights === 1 ? '' : 's'}
                              </span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                Nightly {currency.format(property.nightlyRate / 100)}
                              </span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                {owners.length} owner{owners.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Outstanding expenses</h2>
              <p className="text-sm text-slate-400">Latest pending reimbursements or approvals.</p>
            </div>
            <Link href="/admin/expenses" className="text-sm text-emerald-300 hover:text-emerald-200">
              Open expenses
            </Link>
          </header>

          {pendingExpenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-300">
              No pending expenses right now.
            </p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-200">
              {pendingExpenses.map((expense) => (
                <li key={expense.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-white">{expense.property.name}</p>
                      <p className="text-xs text-slate-400">Incurred {longDate.format(expense.incurredOn)}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-300">{currency.format(expense.amountCents / 100)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming blackouts</h2>
              <p className="text-sm text-slate-400">Maintenance windows or holds you&apos;ve put on the calendar.</p>
            </div>
            <Link href="/admin/blackouts" className="text-sm text-emerald-300 hover:text-emerald-200">
              Manage blackouts
            </Link>
          </header>

          {upcomingBlackouts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-300">
              No upcoming blackouts scheduled.
            </p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-200">
              {upcomingBlackouts.map((blackout) => (
                <li key={blackout.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-base font-medium text-white">{blackout.property.name}</p>
                  <p className="text-xs text-slate-400">
                    {longDate.format(blackout.startDate)} – {longDate.format(blackout.endDate)}
                  </p>
                  {blackout.reason ? <p className="mt-2 text-sm text-slate-300">{blackout.reason}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Knowledge documents</h2>
              <p className="text-sm text-slate-400">Latest files owners rely on in a pinch.</p>
            </div>
            <Link href="/admin/knowledge-hub" className="text-sm text-emerald-300 hover:text-emerald-200">
              Manage documents
            </Link>
          </header>

          {documents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-300">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-200">
              {documents.map((document) => (
                <li key={document.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-base font-medium text-white">{document.title}</p>
                  <p className="text-xs text-slate-400">v{document.version} · Updated {longDate.format(new Date(document.updatedAt))}</p>
                  {document.description ? <p className="mt-2 text-sm text-slate-300">{document.description}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Published playbooks</h2>
              <p className="text-sm text-slate-400">Checklists currently live for owners.</p>
            </div>
            <Link href="/admin/knowledge-hub" className="text-sm text-emerald-300 hover:text-emerald-200">
              Review hub
            </Link>
          </header>

          {publishedChecklists.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-300">
              No published checklists yet.
            </p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-200">
              {publishedChecklists.map((checklist) => (
                <li key={checklist.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-base font-medium text-white">{checklist.title}</p>
                  <p className="text-xs text-slate-400">
                    {checklist.checklist?.category ?? 'General'} · v{checklist.version} · Published{' '}
                    {checklist.publishedAt ? longDate.format(new Date(checklist.publishedAt)) : 'recently'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number;
  href?: string;
  hint?: string;
}) {
  const content = (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="text-sm uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-emerald-300">{hint} pending</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
        {content}
      </Link>
    );
  }

  return content;
}
