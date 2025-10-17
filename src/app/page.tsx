'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

export default function HomePage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full bg-[var(--background-secondary)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)]">
                CALM CONTROL FOR SHARED COTTAGES
              </div>

              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                  Run your cottage
                  <br />
                  <span className="text-emerald-500">like a pro.</span>
                  <br />
                  Keep weekends
                  <br />
                  drama-free.
                </h1>

                <p className="max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
                  Cottagr gives families a single operating system for stays,
                  expenses, and know-how—so every owner knows what's
                  happening before the dock lights come on.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3 text-lg font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
                >
                  Request early access →
                </Link>
                <button className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-8 py-3 text-lg font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-secondary)]">
                  See how it works
                </button>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="relative">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
                {/* Dashboard Header */}
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Owner dashboard</h3>
                  <span className="text-sm text-[var(--muted)]">Friday, 7:02 pm</span>
                </div>

                {/* Dashboard Cards */}
                <div className="space-y-4">
                  {/* Upcoming stays card */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--foreground)]">Upcoming stays</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-semibold text-emerald-500">Next weekend locked</div>
                      <div className="text-sm text-[var(--muted)]">4 approvals · 0 conflicts</div>
                    </div>
                  </div>

                  {/* Grid of smaller cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)] p-4">
                      <div className="text-sm text-[var(--muted)]">Ledger balance</div>
                      <div className="text-lg font-semibold text-emerald-500">$1,248 pending</div>
                      <div className="text-xs text-[var(--muted)]">2 reimbursements ready</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)] p-4">
                      <div className="text-sm text-[var(--muted)]">Knowledge hub</div>
                      <div className="text-lg font-semibold text-[var(--foreground)]">Closing checklist</div>
                      <div className="text-xs text-[var(--muted)]">v4</div>
                      <div className="text-xs text-[var(--muted)]">Updated yesterday • 12 tasks</div>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-3 text-center">
                      <div className="text-xs text-[var(--muted)]">Fairness rules</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-3 text-center">
                      <div className="text-xs text-[var(--muted)]">Instant blackout blocks</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-3 text-center">
                      <div className="text-xs text-[var(--muted)]">Owner voting</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}