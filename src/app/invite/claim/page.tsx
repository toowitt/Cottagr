import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface ClaimPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InviteClaimPage({ searchParams }: ClaimPageProps) {
  const params = await searchParams;
  const tokenParam = params.token;
  const token = typeof tokenParam === 'string' ? tokenParam : Array.isArray(tokenParam) ? tokenParam[0] : undefined;

  if (!token) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16 text-center text-slate-200">
        <h1 className="text-3xl font-semibold text-white">Invitation link invalid</h1>
        <p className="text-sm text-slate-400">
          The invite link is missing its token. Please open the link from your email or contact an administrator for a new
          invitation.
        </p>
      </div>
    );
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      property: {
        select: {
          name: true,
          organization: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!invite) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16 text-center text-slate-200">
        <h1 className="text-3xl font-semibold text-white">Invite not found</h1>
        <p className="text-sm text-slate-400">
          We couldn&apos;t find an invite for that token. It may have expired or already been revoked.
        </p>
      </div>
    );
  }

  const propertyName = invite.property?.name ?? 'the property';
  const organizationName = invite.property?.organization?.name ?? null;
  const inviteClaimed = invite.status === 'CLAIMED';

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16 text-center text-slate-200">
      <h1 className="text-3xl font-semibold text-white">
        {inviteClaimed ? 'Invite already claimed' : 'Claim your invite'}
      </h1>
      <p className="text-sm text-slate-300">
        {inviteClaimed ? (
          <>
            Access to <span className="font-semibold text-white">{propertyName}</span>
            {organizationName ? ` · ${organizationName}` : ''} has already been claimed. You can head straight to your
            dashboard.
          </>
        ) : (
          <>
            You&apos;ve been invited to join <span className="font-semibold text-white">{propertyName}</span>
            {organizationName ? ` · ${organizationName}` : ''}. Sign in with the email that received this invite to finish
            connecting your account.
          </>
        )}
      </p>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          {inviteClaimed ? 'Open dashboard' : 'Sign in to claim access'}
        </Link>
        {!inviteClaimed ? (
          <p className="text-xs text-slate-500">
            After you sign in, we&apos;ll link this property to your account automatically.
          </p>
        ) : null}
      </div>
    </div>
  );
}
