"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const marketingLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/bookings", label: "Bookings" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
];

const authenticatedLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/setup", label: "Setup" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/expenses", label: "Expenses" },
  { href: "/admin/blackouts", label: "Blackouts" },
  { href: "/admin/knowledge-hub", label: "Knowledge Hub" },
  { href: "/blog", label: "Blog" },
  { href: "/admin/guests", label: "Guests" },
];

interface SiteHeaderProps {
  initialAuthenticated?: boolean;
}

export default function SiteHeader({ initialAuthenticated = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const [showAuthenticatedNav, setShowAuthenticatedNav] = useState(initialAuthenticated);
  const supabase = useSupabaseClient();
  const isAdminRoute = pathname?.startsWith("/admin");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  const navLinks = useMemo(
    () => (showAuthenticatedNav ? authenticatedLinks : marketingLinks),
    [showAuthenticatedNav],
  );
  const logoHref = showAuthenticatedNav ? "/admin" : "/";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      document.body.style.removeProperty("overflow");
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
      panelRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

  if (isAdminRoute) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-colors dark:border-gray-800 dark:bg-gray-900/70 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 md:h-24">
        <Link href={logoHref} className="flex items-center gap-2">
          <Image
            src="/Cottagr-wordmark.png"
            alt="Cottagr"
            width={180}
            height={64}
            className="h-10 w-auto sm:h-12 md:h-16"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm lg:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-slate-600 transition-colors hover:text-slate-900 dark:text-gray-300 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}

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

        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav-panel"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 p-2 text-slate-800 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-white/25 lg:hidden"
        >
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileNavOpen ? (
        <div
          id="mobile-nav-panel"
          ref={panelRef}
          className="fixed inset-0 z-[70] flex min-h-dvh flex-col overflow-y-auto bg-slate-950/95 px-6 py-8 text-white backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/80 supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),2rem)] supports-[padding:max(0px)]:pt-[max(env(safe-area-inset-top),1.25rem)] lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between">
            <Link href={logoHref} className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
              <Image src="/Cottagr-wordmark.png" alt="Cottagr" width={140} height={52} className="h-10 w-auto" />
            </Link>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:border-white/30 hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-3 text-lg font-medium">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="rounded-2xl border border-white/10 px-4 py-2.5 transition hover:border-emerald-300/50 hover:bg-emerald-500/10"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-5 border-t border-white/10 pt-4">
              {showAuthenticatedNav ? (
                <form action="/logout" method="post" className="flex">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_20px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_20px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
