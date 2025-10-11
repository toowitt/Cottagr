import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/prisma';
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
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Your participation</h1>
        <p className="text-sm text-slate-400">
          Choose how involved you want to be in approvals, maintenance, and booking notifications. Changes take effect
          immediately.
        </p>
      </header>

      {successKey === 'preferences-saved' ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Preferences saved.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {!hasOwnerships ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-300">
          <p>You are not yet linked to an ownership share. Ask an admin to invite you from the setup area.</p>
          <p className="mt-3 text-xs text-slate-500">
            Need help?{' '}
            <Link href="/admin/setup" className="text-emerald-300 hover:text-emerald-200">
              Go to setup
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {ownerships.map((ownership) => (
            <article
              key={ownership.id}
              className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-inner shadow-black/20"
            >
              <header className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-white">{ownership.property.name}</h2>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Share {(ownership.shareBps / 100).toFixed(2)}% · Voting power {ownership.votingPower}
                </p>
              </header>

              <form action={updateOwnershipPreferences} className="grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="ownershipId" value={ownership.id} />

                <fieldset className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <legend className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Booking participation
                  </legend>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="bookingApprover"
                      defaultChecked={ownership.bookingApprover}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    Approve booking requests
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="autoSkipBookings"
                      defaultChecked={ownership.autoSkipBookings}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    Skip booking approvals by default (counts as abstain)
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="notifyOnBookings"
                      defaultChecked={ownership.notifyOnBookings}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    Notify me about booking activity
                  </label>
                </fieldset>

                <fieldset className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <legend className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Expense & maintenance
                  </legend>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="expenseApprover"
                      defaultChecked={ownership.expenseApprover}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    Approve expenses
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="notifyOnExpenses"
                      defaultChecked={ownership.notifyOnExpenses}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    Notify me about expense activity
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="blackoutManager"
                      defaultChecked={ownership.blackoutManager}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    Allow me to manage blackout dates
                  </label>
                </fieldset>

                <div className="lg:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    Save preferences
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
