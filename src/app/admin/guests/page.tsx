import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Container } from '@/components/ui/Container';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/datagrid/ResponsiveTable';
import { sendGuestInvite, markInviteConsumed } from './actions';

interface GuestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const formatDate = (input: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(input);

export default async function GuestsPage({ searchParams }: GuestsPageProps) {
  const params = await searchParams;
  const successKey = typeof params.success === 'string' ? params.success : undefined;
  const errorMessage = typeof params.error === 'string' ? params.error : undefined;

  const supabase = await createServerSupabaseClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/guests');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/guests');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminOrgIds = memberships
    .filter((membership) => membership.role === 'OWNER_ADMIN')
    .map((m) => m.organizationId);
  const allowedOrgIds = adminOrgIds.length > 0 ? adminOrgIds : [0];

  const properties = await prisma.property.findMany({
    where: {
      organizationId: { in: allowedOrgIds },
    },
    orderBy: { name: 'asc' },
  });

  const invites = await prisma.guestInvite.findMany({
    where: {
      OR: [
        { propertyId: { in: properties.map((property) => property.id) } },
        { propertyId: null },
      ],
    },
    include: {
      property: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  type InviteRecord = (typeof invites)[number];

  const columns: ResponsiveColumn<InviteRecord>[] = [
    {
      id: 'guest',
      header: 'Guest',
      priority: 'high',
      renderCell: (invite) => (
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">{invite.name ?? invite.email}</span>
          <span className="text-xs text-muted-foreground">{invite.email}</span>
        </div>
      ),
      mobileLabel: 'Guest',
    },
    {
      id: 'property',
      header: 'Property',
      priority: 'medium',
      renderCell: (invite) =>
        invite.property ? (
          <span className="text-sm text-foreground">{invite.property.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Any property</span>
        ),
      mobileLabel: 'Property',
    },
    {
      id: 'expires',
      header: 'Expires',
      priority: 'medium',
      renderCell: (invite) => (
        <span className="text-sm text-foreground">{formatDate(invite.expiresAt)}</span>
      ),
      mobileLabel: 'Expires',
    },
    {
      id: 'link',
      header: 'Link',
      priority: 'low',
      renderCell: (invite) => (
        <div className="max-w-xs truncate text-xs text-accent">
          <a href={invite.actionLink} target="_blank" rel="noreferrer">
            {invite.actionLink}
          </a>
        </div>
      ),
      mobileLabel: 'Magic link',
    },
    {
      id: 'actions',
      header: 'Actions',
      priority: 'high',
      align: 'end',
      renderCell: (invite) => (
        <form action={markInviteConsumed.bind(null, invite.id)}>
          <button
            type="submit"
            className="text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={invite.consumedAt !== null}
          >
            {invite.consumedAt ? 'Archived' : 'Archive'}
          </button>
        </form>
      ),
      mobileLabel: 'Actions',
    },
  ];

  return (
    <>
      <PageHeader
        title="Invite guests & caretakers"
        description="Generate Supabase magic links for short-term access. Links expire automatically and can be resent at any time."
        primaryAction={
          <Link
            href="/admin/calendar"
            className="touch-target rounded-full border border-default px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            View schedule
          </Link>
        }
      />

      <Container padding="md" className="space-y-8 py-10">
        {successKey === 'invite-sent' ? (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-strong">
            Magic link generated. Copy it below or forward via email.
          </div>
        ) : null}

        {successKey === 'invite-archived' ? (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-strong">
            Invite archived.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-3xl border border-default bg-background px-6 py-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground">Send a new invite</h2>
          <form action={sendGuestInvite} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Guest email
              </span>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="guest@example.com"
              />
            </label>
            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name (optional)
              </span>
              <input
                type="text"
                name="name"
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="Weekend guest"
              />
            </label>
            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Property
              </span>
              <select
                name="propertyId"
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Any property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-foreground">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Expiry
              </span>
              <select
                name="expiresInDays"
                defaultValue={7}
                className="w-full rounded-xl border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value={1}>24 hours</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Generate magic link
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent invites</h2>
            <Link href="/admin/calendar" className="text-sm font-medium text-accent hover:text-accent-strong">
              View calendar
            </Link>
          </div>

          {invites.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-default bg-background-muted px-4 py-5 text-sm text-muted-foreground">
              No invites yet. Send one above to get started.
            </p>
          ) : (
            <ResponsiveTable
              columns={columns}
              rows={invites}
              rowKey={(invite) => invite.id.toString()}
              mobileTitleColumnId="guest"
            />
          )}
        </section>

        <section className="rounded-2xl border border-default bg-background-muted px-4 py-6 text-xs text-muted-foreground">
          <p>
            Magic links are generated through Supabase and expire automatically. Guests who visit after expiry can request
            a new link from an owner. For recurring guests, consider upgrading them to a full account in the ownership group.
          </p>
        </section>
      </Container>
    </>
  );
}
