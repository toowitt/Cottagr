"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  Users,
  Vote,
  ShieldCheck,
  Timer,
} from "lucide-react";

type Selection = {
  start: string | null;
  end: string | null;
};

type DemoDayStatus = "available" | "booked" | "pending";

interface DemoDay {
  key: string;
  label: number;
  inMonth: boolean;
  status: DemoDayStatus;
}

export default function BookingsExperiencePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <WorkflowSection />
      <HighlightsSection />
      <StepsSection />
      <AssuranceSection />
      <FinalCta />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70rem_70rem_at_40%_-10%,rgba(37,99,235,0.18),transparent_65%),radial-gradient(60rem_60rem_at_100%_10%,rgba(16,185,129,0.18),transparent_60%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-32 lg:pt-28">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
            Booking workflow preview
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            A calm, calendar-led booking flow for every co-owner
          </h1>
          <p className="max-w-xl text-lg text-white/75">
            Show the family the plan before anyone packs a bag. Pick dates, collect votes, and confirm weekends without group-text drama.
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-[0_20px_60px_-28px_rgba(37,99,235,0.9)] transition hover:bg-blue-500"
            >
              See the workflow <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-base text-white/80 transition hover:bg-white/5"
            >
              Share with co-owners
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/60">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Voting transparency</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-400" /> Built for shared homes</div>
          </div>
        </div>

        <div className="relative" aria-hidden="true">
          <div className="mx-auto max-w-lg rounded-[28px] border border-white/15 bg-white/5 p-6 shadow-[0_42px_160px_-60px_rgba(15,23,42,0.55)]">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Request preview</span>
                <span>Friday · 7:45pm</span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">Selected stay</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Aug 29 – Sep 2 · Lakehouse</h3>
                  <p className="mt-2 text-xs text-white/55">4 approvals · 0 conflicts</p>
                </div>
                <div className="grid gap-3 text-xs text-white/70 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">Smart fairness rules</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">Vote audit trail</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">Calendar sync</div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-white/45">Marketing preview of the owner experience.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="border-t border-white/10 bg-gradient-to-b from-black to-zinc-950 py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-start">
        <div className="max-w-xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200">
            Live calendar demo
          </p>
          <h2 className="text-3xl font-semibold text-white md:text-4xl">
            Pick dates, gather approvals, lock the stay
          </h2>
          <p className="text-base text-white/70">
            This is the exact flow co-owners see inside Cottagr. Tap the calendar to explore availability, then watch how requests move from proposal, to vote, to a confirmed weekend without sending a single text.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-4 w-4 text-emerald-400" /> Availability syncs with blackout dates and fairness rules.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-4 w-4 text-emerald-400" /> Owners vote in-line; results are logged automatically.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-4 w-4 text-emerald-400" /> Approved stays push straight to everyone’s calendar.</li>
          </ul>
        </div>
        <WorkflowDemo />
      </div>
    </section>
  );
}

function WorkflowDemo() {
  const [selection, setSelection] = useState<Selection>({
    start: "2025-06-19",
    end: "2025-06-23",
  });
  const [stage, setStage] = useState<"request" | "voting" | "approved">("voting");

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <DemoCalendar selection={selection} onSelect={setSelection} />
      <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
          Request timeline
          <button
            type="button"
            onClick={() =>
              setStage((prev) =>
                prev === "request" ? "voting" : prev === "voting" ? "approved" : "request"
              )
            }
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60 transition hover:border-white/40 hover:text-white/80"
          >
            Cycle stage
          </button>
        </div>

        <div className="space-y-4">
          <TimelineCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Request drafted"
            description="Add context once — owners see availability, notes, and fairness impact in real time."
            active={stage === "request"}
          />
          <TimelineCard
            icon={<Vote className="h-4 w-4" />}
            title="Voting in progress"
            description="Owners tap approve, reject, or abstain. Weighted shares and quorum rules apply automatically."
            active={stage === "voting"}
          />
          <TimelineCard
            icon={<CalendarDays className="h-4 w-4" />}
            title="Weekend confirmed"
            description="Once approved, the stay locks. Everyone receives calendar updates and prep checklists."
            active={stage === "approved"}
          />
        </div>

        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold uppercase tracking-[0.35em] text-emerald-200">Range preview</p>
          <p className="mt-2">
            {selection.start && selection.end
              ? `Selected stay: ${formatRange(selection.start, selection.end)} · ${countNights(
                  selection.start,
                  selection.end,
                )} nights`
              : "Tap the calendar to explore dates."}
          </p>
        </div>
      </div>
    </div>
  );
}

function DemoCalendar({
  selection,
  onSelect,
}: {
  selection: Selection;
  onSelect: (value: Selection) => void;
}) {
  const month = useMemo(() => new Date(2025, 5, 1), []); // June 2025 sample

  const booked = useMemo(
    () =>
      new Set([
        "2025-06-07",
        "2025-06-08",
        "2025-06-09",
        "2025-06-13",
        "2025-06-14",
        "2025-06-21",
        "2025-06-22",
        "2025-06-28",
      ]),
    [],
  );

  const pending = useMemo(
    () => new Set(["2025-06-01", "2025-06-15", "2025-06-29"]),
    [],
  );

  const days = useMemo<DemoDay[]>(() => {
    const start = new Date(month);
    start.setDate(1);
    const weekday = start.getDay();
    start.setDate(start.getDate() - weekday);

    const result: DemoDay[] = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().split("T")[0];
      const inMonth = date.getMonth() === month.getMonth();

      let status: DemoDayStatus = "available";
      if (booked.has(key)) {
        status = "booked";
      } else if (pending.has(key)) {
        status = "pending";
      }

      result.push({
        key,
        label: date.getDate(),
        inMonth,
        status,
      });
    }

    return result;
  }, [booked, month, pending]);

  const handleDayClick = (day: DemoDay) => {
    if (!day.inMonth || day.status !== "available") {
      return;
    }

    if (!selection.start || (selection.start && selection.end)) {
      onSelect({ start: day.key, end: null });
      return;
    }

    if (day.key <= selection.start) {
      onSelect({ start: day.key, end: null });
      return;
    }

    onSelect({ start: selection.start, end: day.key });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-[0.35em] text-white/50">
          June 2025 availability
        </span>
        <Sparkles className="h-4 w-4 text-emerald-300" />
      </div>

      <div className="mt-5 grid grid-cols-7 overflow-hidden rounded-2xl border border-white/10">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
          <div
            key={`label-${weekday}`}
            className="bg-white/5 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white/50"
          >
            {weekday}
          </div>
        ))}

        {days.map((day) => {
          const isCheckIn = selection.start === day.key;
          const isCheckOut = selection.end === day.key;
          const isBetween =
            Boolean(selection.start && selection.end && day.key > selection.start && day.key < selection.end);

          const baseClasses = [
            "relative h-16 border text-sm transition-colors",
            day.inMonth ? "border-white/10" : "border-white/5 text-white/30",
          ];

          if (day.status === "booked") {
            baseClasses.push("bg-rose-500/20 text-rose-100");
          } else if (day.status === "pending") {
            baseClasses.push("bg-amber-500/15 text-amber-100");
          } else {
            baseClasses.push("bg-black/40 text-white/85 hover:bg-emerald-500/25 hover:text-white");
          }

          if (isBetween) {
            baseClasses.push("bg-emerald-500/25 text-emerald-50");
          }

          if (isCheckIn || isCheckOut) {
            baseClasses.push("bg-emerald-500 text-black font-semibold");
          }

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={day.status !== "available" || !day.inMonth}
              className={baseClasses.join(" ")}
            >
              <span className="block text-center text-sm">{day.label}</span>
              {isCheckIn && (
                <span className="mt-1 block text-[10px] uppercase tracking-wide text-black/70">Check-in</span>
              )}
              {isCheckOut && (
                <span className="mt-1 block text-[10px] uppercase tracking-wide text-black/70">Check-out</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/60">
        <LegendSwatch className="bg-emerald-500" label="Selected" />
        <LegendSwatch className="bg-emerald-500/35" label="Requested" />
        <LegendSwatch className="bg-amber-500/35" label="Pending approval" />
        <LegendSwatch className="bg-rose-500/35" label="Unavailable" />
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function TimelineCard({
  icon,
  title,
  description,
  active,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-sm transition ${
        active
          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100 shadow-[0_12px_40px_-24px_rgba(16,185,129,0.65)]"
          : "border-white/10 bg-black/30 text-white/65"
      }`}
    >
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em]">
        <span className="rounded-xl border border-white/10 bg-black/40 p-2 text-white/80">{icon}</span>
        {title}
      </div>
      <p className="mt-3 leading-relaxed">{description}</p>
    </div>
  );
}

function HighlightsSection() {
  const highlights = [
    {
      title: "Stay fair automatically",
      description:
        "Assign allocation rules once. Cottagr keeps track of prime weekend usage so every owner gets a balanced season.",
    },
    {
      title: "One place for context",
      description:
        "Requests keep relevant notes, previous votes, and prep checklists together. New owners catch up instantly.",
    },
    {
      title: "Zero inbox chaos",
      description:
        "Approvals, reminders, and change logs stay in-app. Everyone’s calendar updates without a single reply-all.",
    },
  ];

  return (
    <section className="border-t border-white/10 py-20">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-3xl font-semibold text-white md:text-4xl">What co-owners love about the workflow</h2>
        <p className="mt-3 text-base text-white/70">
          The booking flow is opinionated enough to keep things fair, and flexible enough to handle surprise guests.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-[0_32px_90px_-70px_rgba(37,99,235,0.65)]"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  const steps = [
    {
      title: "1. Propose a stay",
      description:
        "Choose dates, add context, and preview how the stay affects fairness counters before you hit send.",
    },
    {
      title: "2. Owners vote",
      description:
        "Every owner gets one tap approve / reject buttons with optional rationale. Weighted votes and quorum rules apply automatically.",
    },
    {
      title: "3. Confirm & prep",
      description:
        "Once approved, invites hit calendars, checklists unlock, and key handoffs are crystal clear.",
    },
  ];

  return (
    <section className="border-t border-white/10 bg-gradient-to-b from-zinc-950 to-black py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Replay the booking playbook in three moves</h2>
          <p className="mt-3 text-base text-white/70">
            You can run the entire workflow in under two minutes. Fewer pings, more lake time.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm text-white/70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AssuranceSection() {
  const assurances = [
    {
      title: "Audit-friendly",
      description: "Every decision stores votes, rationales, and who confirmed the stay for future seasons.",
      icon: <Vote className="h-5 w-5 text-emerald-300" />,
    },
    {
      title: "Shared accountability",
      description: "Owners see who is staying, for how long, and where fairness counters stand before approving.",
      icon: <Users className="h-5 w-5 text-emerald-300" />,
    },
    {
      title: "Transparent timing",
      description: "Reminders go out automatically when response deadlines approach, so weekends don’t linger unresolved.",
      icon: <Timer className="h-5 w-5 text-emerald-300" />,
    },
  ];

  return (
    <section className="border-t border-white/10 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-semibold text-white md:text-4xl text-center">Designed for calm, not chaos</h2>
        <p className="mt-3 text-center text-base text-white/70">
          Families keep returning to the cottage workflow they can trust.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {assurances.map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/10">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="cta" className="border-t border-white/10 bg-gradient-to-b from-black to-zinc-950 py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h3 className="text-3xl font-semibold text-white">Ready to bring weekends back to chill?</h3>
        <p className="mt-3 text-base text-white/70">
          Drop your email and we’ll send the full owner walkthrough plus early access invites.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            alert("Thanks! We’ll reach out soon with booking workflow access.");
          }}
          className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            placeholder="you@email.com"
            className="h-12 flex-1 rounded-full border border-white/15 bg-black px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Email address"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Request invite
          </button>
        </form>
        <p className="mt-3 text-xs text-white/45">No spam. Leave the list any time.</p>
      </div>
    </section>
  );
}

function formatRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

function countNights(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const nights = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.round(nights);
}
