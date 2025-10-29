"use client";

import Link from "next/link";

interface SupportFooterProps {
  className?: string;
}

export default function SupportFooter({ className }: SupportFooterProps) {
  return (
    <section
      className={`border-t border-slate-200 bg-white py-12 text-slate-900 dark:border-white/10 dark:bg-black dark:text-white ${
        className ?? ""
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Need a hand?</h2>
          <p className="text-sm text-slate-600 dark:text-white/70">
            Our team answers questions at{" "}
            <a
              className="font-semibold text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-300"
              href="mailto:support@cottagr.com"
            >
              support@cottagr.com
            </a>{" "}
            — whether you&apos;re onboarding owners, reconciling expenses, or prepping for a busy season.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/80">
          <p className="font-semibold">Cottagr Copilot (coming soon)</p>
          <p>
            We&apos;re building an AI assistant that can answer questions, draft bookings, surface maintenance history, and prep weekend
            checklists. Have a scenario you&apos;d like it to cover? Let us know.
          </p>
          <Link
            href="mailto:support@cottagr.com?subject=Cottagr%20Copilot%20feedback"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            Share feedback →
          </Link>
        </div>
      </div>
    </section>
  );
}
