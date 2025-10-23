import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  HomeIcon,
  CalendarDays,
  Users as UsersIcon,
  Banknote,
  ClipboardCheck,
  FileText,
  Settings,
  Newspaper,
} from 'lucide-react';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { AppShell, type AppNavItem } from '@/components/navigation/AppShell';

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
    const navItems: AppNavItem[] = [
      { name: 'Home', href: '/admin', icon: HomeIcon },
      { name: 'Bookings', href: '/admin/bookings', icon: CalendarDays },
      { name: 'Owners', href: '/admin/setup?section=owners', icon: UsersIcon },
      { name: 'Expenses', href: '/admin/expenses', icon: Banknote },
      { name: 'Tasks', href: '/admin/calendar', icon: ClipboardCheck },
      { name: 'Documents', href: '/admin/knowledge-hub', icon: FileText },
      { name: 'Blog', href: '/admin/blog', icon: Newspaper },
      { name: 'Settings', href: '/admin/profile', icon: Settings },
    ];

    return (
      <AppShell title="Cottagr Admin" navItems={navItems}>
        <div className="mx-auto max-w-3xl px-4 py-10">
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
        </div>
      </AppShell>
    );
  }

  const navItems: AppNavItem[] = [
    { name: 'Home', href: '/admin', icon: HomeIcon },
    { name: 'Bookings', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Owners', href: '/admin/owners', icon: UsersIcon },
    { name: 'Expenses', href: '/admin/expenses', icon: Banknote },
    { name: 'Tasks', href: '/admin/calendar', icon: ClipboardCheck },
    { name: 'Documents', href: '/admin/knowledge-hub', icon: FileText },
    { name: 'Blog', href: '/admin/blog', icon: Newspaper },
    { name: 'Settings', href: '/admin/profile', icon: Settings },
  ];

  return (
    <AppShell
      title={<span className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Cottagr Admin</span>}
      navItems={navItems}
      bottomNavItems={navItems.slice(0, 5)}
    >
      <div className="px-4 py-6 md:px-8 lg:px-12">{children}</div>
    </AppShell>
  );
}
