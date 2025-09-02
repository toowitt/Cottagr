"use client";
import { CalendarDays, Receipt, BookOpenText, ShieldCheck, Users, ArrowRight } from "lucide-react";

export default function CottagrLandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_60rem_at_50%_-10%,rgba(37,99,235,0.20),transparent_60%),radial-gradient(40rem_40rem_at_100%_10%,rgba(16,185,129,0.18),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-24 pt-16 md:grid-cols-2 md:pb-28 md:pt-24">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              Built for co‑owned cottages
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              One cottage.<br />
              Many owners.<br />
              <span className="text-blue-400">Zero headaches.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Cottagr replaces spreadsheets and group chats with a single, calm source of truth for bookings, expenses, and know‑how.
            </p>
            <div id="cta" className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="#early-access"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-base font-medium shadow-lg shadow-blue-600/30 hover:bg-blue-500"
              >
                Request Early Access <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-base text-white/90 hover:bg-white/5"
              >
                Book a Demo
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400"/> Privacy‑first</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-400"/> Built for families</div>
            </div>
          </div>
          <div className="relative">
            <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
              <img src="/cottagr-hero.png" alt="Cottagr app preview placeholder" className="aspect-video w-full rounded-2xl object-cover" />
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-white/70">
                <div className="rounded-xl border border-white/10 p-3">Owner votes</div>
                <div className="rounded-xl border border-white/10 p-3">Calendar sync</div>
                <div className="rounded-xl border border-white/10 p-3">Auto‑split</div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-white/50">Screens for illustration. Actual UI may vary.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-white/10 bg-gradient-to-b from-black to-zinc-950 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything co‑owners need, in one place</h2>
            <p className="mt-3 text-white/70">Cottagr simplifies the three pain points that cause most conflicts.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-6 w-6" />}
              title="Booking & Access"
              points={[
                "Propose and vote on requests",
                "Fairness rules & blackout dates",
                "iCal/Google sync for everyone",
              ]}
            />
            <FeatureCard
              icon={<Receipt className="h-6 w-6" />}
              title="Expense Tracking"
              points={[
                "Snap receipts, auto‑split by share",
                "Ledger of inflows/outflows",
                "Transparent settlements",
              ]}
            />
            <FeatureCard
              icon={<BookOpenText className="h-6 w-6" />}
              title="Knowledge Hub"
              points={[
                "Open/close checklists",
                "Wiring diagrams & permits",
                "Vendors & maintenance schedules",
              ]}
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
            <p className="mt-3 text-white/70">From chaos to clarity in three steps.</p>
          </div>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { n: 1, t: "Invite co‑owners", d: "Set ownership shares and rules once." },
              { n: 2, t: "Connect calendars", d: "Propose dates, vote, and lock in time." },
              { n: 3, t: "Keep it tidy", d: "Upload receipts and store the know‑how." },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-5xl font-black text-blue-500">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-white/70">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-white/10 bg-zinc-950 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Simple pricing</h2>
            <p className="mt-3 text-white/70">Pay for peace of mind, not per argument.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-xl font-semibold">Early Access</h3>
              <p className="mt-1 text-sm text-white/70">Limited seats</p>
              <p className="mt-6 text-5xl font-extrabold tracking-tight">$0</p>
              <p className="mt-2 text-sm text-white/70">Free while in beta</p>
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                <li>• All core features</li>
                <li>• Priority support & roadmap input</li>
                <li>• Smooth upgrade to paid plan</li>
              </ul>
              <a href="#early-access" className="mt-6 inline-block rounded-2xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500">Request invite</a>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-xl font-semibold">Family Plan</h3>
              <p className="mt-1 text-sm text-white/70">Coming at launch</p>
              <p className="mt-6 text-5xl font-extrabold tracking-tight">$—</p>
              <p className="mt-2 text-sm text-white/70">Flat monthly fee per cottage</p>
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                <li>• Unlimited co‑owners & guests</li>
                <li>• Calendar sync + expense auto‑split</li>
                <li>• Document storage & task schedules</li>
              </ul>
              <span className="mt-6 inline-block rounded-2xl border border-white/15 px-5 py-3 text-white/60">Notify me</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">FAQ</h2>
            <p className="mt-3 text-white/70">Quick answers to common questions.</p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {[
              {
                q: "Can my co‑owners have separate logins?",
                a: "Yes. Each owner gets an account with their permissions, vote weight, and calendar sync settings.",
              },
              {
                q: "How are expenses split?",
                a: "Set ownership percentages once. Snap or upload receipts and Cottagr calculates each owner’s share and tracks settlements.",
              },
              {
                q: "What about privacy?",
                a: "Your cottage data is private to your group. We use modern security practices and give you full control over who sees what.",
              },
              {
                q: "Can we rent to outsiders?",
                a: "Yes. Toggle renter mode to track guest bookings and automatically allocate revenue back to owners by share.",
              },
            ].map((f, i) => (
              <details key={i} className="group rounded-2xl border border-white/10 p-5 open:bg-white/5">
                <summary className="flex cursor-pointer select-none items-center justify-between text-base font-medium">
                  {f.q}
                  <span className="ml-4 text-white/40 group-open:hidden">+</span>
                  <span className="ml-4 hidden text-white/40 group-open:block">−</span>
                </summary>
                <p className="mt-3 text-sm text-white/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* EARLY ACCESS FORM (embed‑ready placeholder) */}
      <section id="early-access" className="border-y border-white/10 bg-gradient-to-b from-zinc-950 to-black py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h3 className="text-2xl font-semibold">Want in early?</h3>
          <p className="mt-2 text-white/70">Drop your email and we’ll reach out with a private beta invite.</p>
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
              className="h-12 flex-1 rounded-2xl border border-white/15 bg-black px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="h-12 rounded-2xl bg-emerald-500 px-5 font-medium text-black hover:bg-emerald-400"
            >
              Request Invite
            </button>
          </form>
          <p className="mt-3 text-xs text-white/50">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3 text-white/70">
            <img src="/cottagr-logo.png" alt="Cottagr logo" className="h-6 w-6" />
            <span className="text-sm">© {new Date().getFullYear()} Cottagr</span>
          </div>
          <div className="text-xs text-white/50">
            Made for families who share a place they love.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, points }: { icon: React.ReactNode; title: string; points: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {points.map((p, i) => (
          <li key={i}>• {p}</li>
        ))}
      </ul>
    </div>
  );
}
