"use client";
import MarketingSection from "@/components/marketing/MarketingSection";
import SupportFooter from "@/components/SupportFooter";
import {
  CalendarDays,
  Receipt,
  BookOpenText,
  ShieldCheck,
  Users,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

export default function CottagrLandingPage() {
  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:bg-black dark:text-white">

      {/* HERO */}
      <section className="relative overflow-hidden bg-white dark:bg-black">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70rem_70rem_at_40%_-10%,rgba(52,211,153,0.15),transparent_65%),radial-gradient(50rem_50rem_at_100%_10%,rgba(37,99,235,0.14),transparent_60%)] dark:bg-[radial-gradient(70rem_70rem_at_40%_-10%,rgba(52,211,153,0.18),transparent_65%),radial-gradient(50rem_50rem_at_100%_10%,rgba(37,99,235,0.16),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-28 pt-20 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:pb-32 md:pt-28">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              Calm control for shared cottages
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] text-slate-900 dark:text-white md:text-6xl">
              Run your cottage like a pro.<br />
              Keep weekends drama‑free.
            </h1>
            <p className="max-w-xl text-lg text-slate-600 dark:text-white/75">
              Cottagr gives families a single operating system for stays, expenses, and know‑how—so every owner
              knows what&apos;s happening before the dock lights come on.
            </p>
            <div id="cta" className="flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="#early-access"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-black shadow-[0_20px_60px_-28px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
              >
                Request early access <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-base text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-white/85 dark:hover:bg-white/10"
              >
                See how it works
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 dark:text-white/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                Bank‑grade security
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                Built for multi‑owner families
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                Real‑time booking health
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="card-sheen mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_42px_120px_-40px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_42px_120px_-40px_rgba(15,23,42,0.9)]">
              <div className="space-y-6 rounded-[22px] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-black/40">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/60">
                  <span>Owner dashboard</span>
                  <span>Friday, 7:42 pm</span>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/50">
                    <p className="text-sm text-slate-500 dark:text-white/70">Upcoming stays</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Long weekend locked</h3>
                    <p className="mt-1 text-xs text-slate-400 dark:text-white/50">4 approvals · 0 conflicts</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/50">
                      <p className="text-xs text-slate-500 dark:text-white/60">Ledger balance</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">$1,248 pending</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300">2 reimbursements ready</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/50">
                      <p className="text-xs text-slate-500 dark:text-white/60">Knowledge hub</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Closing checklist v4</p>
                      <p className="text-xs text-slate-400 dark:text-white/50">Updated yesterday • 12 tasks</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[0.7rem] text-slate-500 dark:text-white/70">
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/40">Fairness rules</div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/40">Instant blackout blocks</div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/40">Owner voting</div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 dark:text-white/45">Interface preview for illustration. Actual product may vary.</p>
          </div>
        </div>
      </section>

      <MarketingSection
        variant="muted"
        containerClassName="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-center"
      >
        <div className="space-y-6 rounded-[30px] border border-border/60 bg-background p-8 text-slate-900 shadow-[0_35px_110px_-60px_rgba(15,23,42,0.18)] dark:text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background-muted px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500 dark:border-white/20 dark:bg-white/10 dark:text-white/60">
            Why families trust Cottagr
          </div>
          <blockquote className="space-y-4 text-slate-700 dark:text-white/80">
            <p className="text-lg italic text-slate-800 dark:text-white/85">
              “We went from late-night text threads to a single dashboard. Votes happen fast, expenses settle on time,
              and the opening checklist is always up to date.”
            </p>
            <footer className="text-sm text-slate-500 dark:text-white/55">
              – Laura M., co-owner of a 4-family Muskoka cottage
            </footer>
          </blockquote>
        </div>
        <div className="grid gap-4">
          {[
            {
              title: "Clarity out of the box",
              description: "Owner dashboards spotlight upcoming stays, approvals, and documents without digging.",
              icon: <BarChart3 className="h-5 w-5 text-emerald-500" />,
            },
            {
              title: "Roles built for real life",
              description: "Owner admins, owners, and caretakers see tailored tools—no oversharing or guesswork.",
              icon: <Users className="h-5 w-5 text-emerald-500" />,
            },
            {
              title: "Confidence in every decision",
              description: "Fairness rules, voting history, and knowledge versions keep the next handover smooth.",
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-border/60 bg-background p-6 text-slate-900 shadow-[0_32px_90px_-70px_rgba(15,23,42,0.18)] dark:text-white"
            >
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className="rounded-2xl bg-emerald-500/15 p-2 text-emerald-500 dark:text-emerald-300">
                  {item.icon}
                </span>
                {item.title}
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-white/75">{item.description}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection variant="muted">
        <div className="grid gap-6 text-slate-900 dark:text-white sm:grid-cols-3">
          {[
            {
              label: "Owners kept in sync",
              value: "150+",
              detail: "Multi-family groups moved off spreadsheets",
            },
            {
              label: "Decisions resolved",
              value: "98%",
              detail: "Booking requests approved without back-and-forth",
            },
            {
              label: "Time saved each month",
              value: "12 hrs",
              detail: "Per ownership group on average",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-border/60 bg-background p-6 text-center shadow-[0_34px_110px_-80px_rgba(15,23,42,0.15)] dark:border-white/15 dark:bg-white/5 dark:text-white"
            >
              <div className="text-4xl font-semibold text-slate-900 dark:text-white">{stat.value}</div>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.25em] text-slate-500 dark:text-white/40">{stat.label}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-white/70">{stat.detail}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* FEATURES */}
      <MarketingSection id="features">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything co‑owners need, in one calm workspace</h2>
          <p className="mt-3 text-slate-600 dark:text-white/70">
            Replace fragile spreadsheets and message threads with a platform designed for transparency, fairness,
            and shared stewardship.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<CalendarDays className="h-6 w-6" />}
            eyebrow="Operational clarity"
            title="Booking & Access"
            points={[
              "Propose, discuss, and vote on stays in one thread",
              "Automated fairness rules, blackout holds, and quick blocks",
              "Real-time calendar sync to iCal, Google, and Outlook",
              "Owner dashboard surfaces conflicts before they happen",
            ]}
            href="/admin/bookings"
          />
          <FeatureCard
            icon={<Receipt className="h-6 w-6" />}
            eyebrow="Shared accountability"
            title="Expense Tracking"
            points={[
              "Snap receipts, auto-split by owner share, and tag payers",
              "Approval flows keep reimbursements moving without email",
              "Ledger view shows deposits, payouts, and settlements",
              "Export-ready history for accountants and tax season",
            ]}
            href="/admin/expenses"
          />
          <FeatureCard
            icon={<BookOpenText className="h-6 w-6" />}
            eyebrow="Always-on knowledge"
            title="Knowledge Hub"
            points={[
              "Versioned opening/closing checklists with approvals",
              "Central vault for manuals, diagrams, and permits",
              "Recurring maintenance schedules with blackout reminders",
              "Owners see the latest playbook from any device",
            ]}
            href="/admin/knowledge-hub"
          />
        </div>
      </MarketingSection>

      {/* HOW IT WORKS */}
      <MarketingSection id="how" className="scroll-mt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
          <p className="mt-3 text-slate-600 dark:text-white/70">From the first invite to a calm cottage rhythm in four clear moves.</p>
        </div>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-4">
          {[
            {
              n: 1,
              t: "Create your ownership group",
              d: "Spin up an organization, assign owner-admins, and set the guardrails for who can approve what.",
            },
            {
              n: 2,
              t: "Add properties & owners",
              d: "Define shares, voting power, nightly rates, and blackout rules for each cottage you manage.",
            },
            {
              n: 3,
              t: "Launch the operating dashboard",
              d: "Use the booking board, expense approvals, and knowledge hub to keep decisions in one place.",
            },
            {
              n: 4,
              t: "Share access in minutes",
              d: "Send magic links to owners, caretakers, or guests—roles keep data scoped to what they need.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="card-sheen rounded-[24px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_30px_90px_-70px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <div className="text-5xl font-black text-emerald-500 dark:text-emerald-400">{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-white/70">{s.d}</p>
            </li>
          ))}
        </ol>
      </MarketingSection>

      {/* PRICING */}
      <MarketingSection
        id="pricing"
        className="scroll-mt-32 bg-[#f6f8ff] dark:bg-zinc-950"
        containerClassName="max-w-7xl"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-slate-900 dark:text-white">Simple pricing</h2>
          <p className="mt-3 text-slate-600 dark:text-white/70">Pay for peace of mind, not per argument.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="card-sheen rounded-[28px] border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5 dark:text-white">
            <h3 className="text-xl font-semibold">Early Access</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/70">Limited seats</p>
            <p className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">$0</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70">Free while in beta</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-white/80">
              <li>• All core features</li>
              <li>• Priority support & roadmap input</li>
              <li>• Smooth upgrade to paid plan</li>
            </ul>
            <a
              href="#early-access"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-black shadow-[0_20px_60px_-30px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
            >
              Request invite
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="card-sheen rounded-[28px] border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5 dark:text-white">
            <h3 className="text-xl font-semibold">Family Plan</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-white/70">Coming at launch</p>
            <p className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">$—</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70">Flat monthly fee per cottage</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-white/80">
              <li>• Unlimited co‑owners & guests</li>
              <li>• Calendar sync + expense auto‑split</li>
              <li>• Document storage & task schedules</li>
            </ul>
            <span className="mt-8 inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white/70 backdrop-blur">
              Notify me at launch
            </span>
          </div>
        </div>
      </MarketingSection>

      {/* FAQ */}
      <MarketingSection id="faq" className="scroll-mt-32" containerClassName="max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-slate-900 dark:text-white">FAQ</h2>
          <p className="mt-3 text-slate-600 dark:text-white/70">Quick answers to common questions.</p>
        </div>
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {[
            {
              q: "Can my co-owners have separate logins?",
              a: "Absolutely. Invite them with a magic link or password and assign a role (Owner Admin, Owner, or Caretaker). Each person sees only the organizations and properties you share with them.",
            },
            {
              q: "How do bookings get approved?",
              a: "Owners propose dates, add context, and vote. Fairness rules, blackout holds, and minimum nights are enforced automatically, and the dashboard surfaces any conflicts before they escalate.",
            },
            {
              q: "What does the expense workflow look like?",
              a: "Upload a receipt, tag who paid, and Cottagr splits it by ownership share. Other owners approve or comment, and the ledger keeps a running balance ready for payouts or accountant exports.",
            },
            {
              q: "Where do we store manuals and checklists?",
              a: "The Knowledge Hub keeps versioned playbooks, documents, and maintenance cadences in one place. Publish updates when they are ready so everyone sees the latest instructions.",
            },
            {
              q: "Can caretakers or guests use the app?",
              a: "Yes. Assign the Caretaker role for limited operational access or share read-only booking links with guests. Sensitive ownership data stays scoped to the people who need it.",
            },
            {
              q: "What happens when we add another cottage?",
              a: "Add a new property to your organization (or create a new org) and the dashboard updates instantly with fresh counts, expenses, blackouts, and documents for that place.",
            },
          ].map((f, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-slate-200 p-5 open:bg-slate-50 dark:border-white/10 dark:open:bg-white/5"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between text-base font-medium text-slate-900 dark:text-white">
                {f.q}
                <span className="ml-4 text-slate-400 group-open:hidden dark:text-white/40">+</span>
                <span className="ml-4 hidden text-slate-400 group-open:block dark:text-white/40">−</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-white/70">{f.a}</p>
            </details>
          ))}
        </div>
      </MarketingSection>

      {/* EARLY ACCESS FORM (embed‑ready placeholder) */}
      <MarketingSection
        id="early-access"
        className="scroll-mt-32 bg-slate-100 text-slate-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:to-black dark:text-white"
        containerClassName="max-w-3xl text-center"
        withDivider={false}
      >
        <h3 className="text-2xl font-semibold">Want in early?</h3>
        <p className="mt-2 text-slate-600 dark:text-white/70">Drop your email and we’ll reach out with a private beta invite.</p>
        {/* Replace the form below with your real form / API hook */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thanks! We'll be in touch soon.");
          }}
          className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            placeholder="you@email.com"
            className="h-12 flex-1 rounded-full border border-slate-200 bg-white px-5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-white/20 dark:bg-black/50 dark:text-white dark:placeholder-white/40"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-emerald-500 px-6 font-semibold text-black shadow-[0_20px_60px_-30px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
          >
            Request Invite
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500 dark:text-white/50">No spam. Unsubscribe anytime.</p>
      </MarketingSection>

      {/* FOOTER */}
      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-sm text-slate-500 dark:text-white/70">
            © {new Date().getFullYear()} Cottagr
          </div>
          <div className="text-xs text-slate-400 dark:text-white/50">
            Made for families who share a place they love.
          </div>
        </div>
      </footer>
      <SupportFooter />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  points,
  href,
  eyebrow,
}: {
  icon: React.ReactNode;
  title: string;
  points: string[];
  href?: string;
  eyebrow?: string;
}) {
  return (
    <article className="card-sheen h-full rounded-[26px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/5 dark:text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-500 dark:text-emerald-300">{icon}</div>
        {href ? <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-white/40" aria-hidden="true" /> : null}
      </div>
      {eyebrow ? (
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/40">{eyebrow}</p>
      ) : null}
      <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-white/70">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500 dark:text-emerald-300" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {href ? (
        <a
          href={href}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          Learn more
          <ArrowRight className="h-4 w-4" />
        </a>
      ) : null}
    </article>
  );
}
