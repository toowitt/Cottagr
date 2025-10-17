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

      {/* Features Section */}
      <section className="bg-[var(--background-secondary)] px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Everything you need to manage your shared cottage
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
              From booking conflicts to expense splits, Cottagr handles the logistics so you can focus on making memories.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500">
                <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">Smart Booking System</h3>
              <p className="mt-2 text-[var(--muted)]">
                Automated fairness tracking, conflict resolution, and approval workflows that keep everyone happy.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500">
                <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">Expense Management</h3>
              <p className="mt-2 text-[var(--muted)]">
                Track shared costs, split bills automatically, and keep transparent records of who owes what.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500">
                <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">Knowledge Hub</h3>
              <p className="mt-2 text-[var(--muted)]">
                Store maintenance guides, local recommendations, and house rules in one organized, searchable place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              How Cottagr works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
              A simple, three-step process that transforms cottage chaos into calm coordination.
            </p>
          </div>

          <div className="mt-16 space-y-12">
            {/* Step 1 */}
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="lg:order-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                      1
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Set up your cottage profile</h3>
                  </div>
                  <p className="mt-3 text-[var(--muted)]">
                    Add basic property details, invite co-owners, and configure your fairness rules. Takes about 10 minutes to get everything running.
                  </p>
                </div>
              </div>
              <div className="lg:order-1">
                <div className="aspect-video rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)]"></div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                      2
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Book stays with confidence</h3>
                  </div>
                  <p className="mt-3 text-[var(--muted)]">
                    Pick dates, collect approvals, and confirm weekends without group-chat drama. Everyone sees the same calendar and voting results.
                  </p>
                </div>
              </div>
              <div>
                <div className="aspect-video rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)]"></div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="lg:order-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                      3
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Keep everything organized</h3>
                  </div>
                  <p className="mt-3 text-[var(--muted)]">
                    Track expenses, share maintenance updates, and access house guides—all in one place that every owner can rely on.
                  </p>
                </div>
              </div>
              <div className="lg:order-1">
                <div className="aspect-video rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[var(--background-secondary)] px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Ready to eliminate cottage chaos?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
            Join the waitlist and be among the first families to experience stress-free cottage management.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3 text-lg font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
            >
              Get early access →
            </Link>
            <button className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-8 py-3 text-lg font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]">
              Schedule a demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}