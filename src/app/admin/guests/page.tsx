import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { prisma } from '@/lib/prisma';
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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin/guests');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/guests');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminOrgIds = memberships.filter((membership) => membership.role === 'OWNER_ADMIN').map((m) => m.organizationId);
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

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Invite guests & caretakers</h1>
        <p className="text-sm text-slate-400">
          Generate Supabase magic links for short-term access. Links expire automatically and can be resent at any time.
        </p>
      </header>

      {successKey === 'invite-sent' ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Magic link generated. Copy it below or forward via email.
        </div>
      ) : null}

      {successKey === 'invite-archived' ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Invite archived.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Send a new invite</h2>
        <form action={sendGuestInvite} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Guest email</span>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="guest@example.com"
            />
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Name (optional)</span>
            <input
              type="text"
              name="name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Weekend guest"
            />
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Property</span>
            <select
              name="propertyId"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Any property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Expiry</span>
            <select
              name="expiresInDays"
              defaultValue={7}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              Generate magic link
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Recent invites</h2>
        {invites.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-5 text-sm text-slate-300">
            No invites yet. Send one above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Guest</th>
                  <th className="px-4 py-3 text-left">Property</th>
                  <th className="px-4 py-3 text-left">Expires</th>
                  <th className="px-4 py-3 text-left">Link</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{invite.name ?? invite.email}</div>
                      <div className="text-xs text-slate-400">{invite.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {invite.property ? invite.property.name : <span className="text-slate-500">Any property</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(invite.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate text-xs text-emerald-300">
                        <a href={invite.actionLink} target="_blank" rel="noreferrer">
                          {invite.actionLink}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <form action={markInviteConsumed.bind(null, invite.id)} className="flex justify-end">
                        <button
                          type="submit"
                          className="text-xs text-slate-400 hover:text-slate-200"
                          disabled={invite.consumedAt !== null}
                        >
                          {invite.consumedAt ? 'Archived' : 'Archive'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-xs text-slate-400">
        <p>
          Magic links are generated through Supabase and expire automatically. Guests who visit after expiry can request
          a new link from an owner. For recurring guests, consider upgrading them to a full account in the ownership
          group.
        </p>
      </section>
    </div>
  );
}
