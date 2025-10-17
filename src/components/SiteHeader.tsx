"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const marketingLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

const authenticatedLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/setup', label: 'Setup' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/expenses', label: 'Expenses' },
  { href: '/admin/blackouts', label: 'Blackouts' },
  { href: '/admin/knowledge-hub', label: 'Knowledge Hub' },
  { href: '/admin/guests', label: 'Guests' },
  { href: '/admin/profile', label: 'Preferences' },
];

interface SiteHeaderProps {
  initialAuthenticated?: boolean;
}

export default function SiteHeader({ initialAuthenticated = false }: SiteHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showAuthenticatedNav, setShowAuthenticatedNav] = useState(initialAuthenticated);
  const supabase = useSupabaseClient();

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) {
        setShowAuthenticatedNav(Boolean(user));
      }
    };

    syncUser();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) {
        setShowAuthenticatedNav(Boolean(user));
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const isDark = theme === 'dark';
  const navLinks = useMemo(
    () => (showAuthenticatedNav ? authenticatedLinks : marketingLinks),
    [showAuthenticatedNav],
  );
  const logoHref = showAuthenticatedNav ? '/admin' : '/';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-colors dark:border-gray-800 dark:bg-gray-900/70 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-4">
        {/* Logo (bigger) */}
        <Link href={logoHref} className="flex items-center">
          <Image
            src="/Cottagr-wordmark.png"
            alt="Cottagr"
            width={220}
            height={96}
            className="h-16 w-auto"
            priority
          />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-slate-600 transition-colors hover:text-slate-900 dark:text-gray-300 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-default bg-card text-muted-foreground shadow-custom transition-all duration-200 ease-in-out hover:bg-background-secondary hover:text-foreground hover:shadow-custom-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background active:scale-95"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <SunMedium className="h-5 w-5 transition-transform duration-200" /> : <Moon className="h-5 w-5 transition-transform duration-200" />}
          </button>
          {showAuthenticatedNav ? (
            <form action="/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
