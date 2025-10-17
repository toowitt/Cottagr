
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
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                CALM CONTROL FOR SHARED COTTAGES
              </div>

              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
                  Run your cottage
                  <br />
                  <span className="text-emerald-500">like a pro.</span>
                  <br />
                  Keep weekends
                  <br />
                  drama-free.
                </h1>

                <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
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
                <button className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-transparent px-8 py-3 text-lg font-semibold text-slate-900 dark:text-slate-50 transition hover:bg-slate-50 dark:hover:bg-slate-900">
                  See how it works
                </button>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="relative">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
                {/* Dashboard Header */}
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Owner dashboard</h3>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Friday, 7:02 pm</span>
                </div>

                {/* Dashboard Cards */}
                <div className="space-y-4">
                  {/* Upcoming stays card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Upcoming stays</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-semibold text-emerald-500">Next weekend locked</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">4 approvals · 0 conflicts</div>
                    </div>
                  </div>

                  {/* Grid of smaller cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">Ledger balance</div>
                      <div className="text-lg font-semibold text-emerald-500">$1,248 pending</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">2 reimbursements ready</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">Knowledge hub</div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Closing checklist</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">v4</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Updated yesterday • 12 tasks</div>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400">Fairness rules</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400">Instant blackout blocks</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-center">
                      <div className="text-xs text-slate-600 dark:text-slate-400">Owner voting</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-50 dark:bg-slate-900 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Everything you need to manage your cottage
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Built specifically for families sharing vacation properties. No more spreadsheets, group texts, or weekend drama.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Smart booking system</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Fair allocation with automatic conflict resolution. Set your preferences once, let the system handle the rest.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Expense tracking</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Track repairs, utilities, and improvements. Split costs fairly and get reimbursed automatically.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Knowledge hub</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Centralized checklists, local contacts, and property know-how. Never lose tribal knowledge again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Simple setup, powerful results. Get your cottage organized in minutes, not months.
            </p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">1</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Set up your cottage</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Add your property details, invite owners, and configure your fairness rules.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">2</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Make bookings</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Request dates, resolve conflicts automatically, and keep everyone informed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">3</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Enjoy your weekends</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Focus on making memories instead of managing logistics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            One flat fee per cottage, no matter how many owners or guests you have.
          </p>
          <div className="mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 dark:text-slate-50">$29</div>
              <div className="text-slate-600 dark:text-slate-400">per cottage, per month</div>
              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Currently in beta - join the waitlist for early access
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-slate-50 dark:bg-slate-900 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">How many owners can use one cottage account?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Unlimited. Whether you have 2 owners or 20, everyone gets full access to the booking system, expense tracking, and knowledge hub.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Can guests access the system?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Yes, through secure guest invites. They can see relevant checklists and property info without accessing owner-only features like expenses or voting.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">What happens if owners disagree on bookings?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Cottagr's voting system handles conflicts automatically based on your fairness rules. No more endless group texts or hurt feelings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Ready to eliminate cottage chaos?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Join the beta and be among the first families to experience drama-free cottage weekends.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3 text-lg font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
            >
              Request early access →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
