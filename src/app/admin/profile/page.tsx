import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/prisma';
import { formatShare } from '@/lib/share';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { updateOwnershipPreferences } from './actions';

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OwnerProfilePage({ searchParams }: ProfilePageProps) {
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
    redirect('/login?redirect=/admin/profile');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/profile');
  }

  const owner = await prisma.owner.findUnique({
    where: { email: user.email ?? '' },
    include: {
      ownerships: {
        include: {
          property: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const ownerships = owner?.ownerships ?? [];
  const hasOwnerships = ownerships.length > 0;

  return (
    <>
      <PageHeader
        title="Your participation"
        description="Choose how involved you want to be in approvals, maintenance, and booking notifications. Changes take effect immediately."
      />

      <Container padding="md" className="space-y-8 py-10">
        {successKey === 'preferences-saved' ? (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-strong">
            Preferences saved.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        {!hasOwnerships ? (
          <div className="rounded-2xl border border-default bg-background-muted px-4 py-6 text-sm text-muted-foreground">
            <p>You are not yet linked to an ownership share. Ask an admin to invite you from the setup area.</p>
            <p className="mt-3 text-xs text-muted-foreground/70">
              Need help?{' '}
              <Link href="/admin/setup" className="text-accent hover:text-accent-strong">
                Go to setup
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {ownerships.map((ownership) => (
              <article
                key={ownership.id}
                className="space-y-6 rounded-3xl border border-default bg-background px-6 py-6 shadow-soft"
              >
                <header className="flex flex-col gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{ownership.property.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Share {formatShare(ownership.shareBps)} · Voting power {ownership.votingPower}
                  </p>
                </header>

                <form action={updateOwnershipPreferences} className="grid gap-4 lg:grid-cols-2">
                  <input type="hidden" name="ownershipId" value={ownership.id} />

                  <fieldset className="space-y-3 rounded-2xl border border-default bg-background-muted px-4 py-4">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Booking participation
                    </legend>
                    <PreferenceToggle
                      name="bookingApprover"
                      defaultChecked={ownership.bookingApprover}
                      label="Approve booking requests"
                    />
                    <PreferenceToggle
                      name="autoSkipBookings"
                      defaultChecked={ownership.autoSkipBookings}
                      label="Skip booking approvals by default (counts as abstain)"
                    />
                    <PreferenceToggle
                      name="notifyOnBookings"
                      defaultChecked={ownership.notifyOnBookings}
                      label="Notify me about booking activity"
                    />
                  </fieldset>

                  <fieldset className="space-y-3 rounded-2xl border border-default bg-background-muted px-4 py-4">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Expense & maintenance
                    </legend>
                    <PreferenceToggle
                      name="expenseApprover"
                      defaultChecked={ownership.expenseApprover}
                      label="Approve expenses"
                    />
                    <PreferenceToggle
                      name="notifyOnExpenses"
                      defaultChecked={ownership.notifyOnExpenses}
                      label="Notify me about expense activity"
                    />
                    <PreferenceToggle
                      name="blackoutManager"
                      defaultChecked={ownership.blackoutManager}
                      label="Allow me to manage blackout dates"
                    />
                  </fieldset>

                  <div className="lg:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    >
                      Save preferences
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

function PreferenceToggle({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-default text-accent focus:ring-accent"
      />
      <span className="leading-tight text-sm text-foreground/90">{label}</span>
    </label>
  );
}
