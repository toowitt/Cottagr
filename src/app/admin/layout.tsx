import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';

export const metadata = {
  title: 'Admin | Cottagr',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminMemberships = memberships.filter((membership) => membership.role === 'OWNER_ADMIN');

  if (adminMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-900 dark:text-emerald-100">
            <h1 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">No admin access yet</h1>
            <p className="mt-2 text-emerald-700/90 dark:text-emerald-200/80">
              You&apos;re signed in, but you need owner admin permissions to see the full dashboard. Create your
              first organization below or ask an existing owner admin to upgrade you.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/setup"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Go to setup
              </Link>
            </div>
          </div>

          <div className="mt-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}