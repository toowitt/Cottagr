import Link from "next/link";
import {
  AdminPage,
  AdminSection,
  AdminMetric,
  AdminMetricGrid,
  AdminCard,
  AdminTableContainer,
} from "@/components/ui/AdminPage";

const SAMPLE_ROWS = [
  { name: "Lakehouse", owner: "Sam Smith", nights: 4, status: "Approved" },
  { name: "Forest Retreat", owner: "Alex Johnson", nights: 2, status: "Pending" },
  { name: "Harbourview", owner: "Jamie Fox", nights: 5, status: "Approved" },
];

export default function AdminUiShowcasePage() {
  return (
    <AdminPage
      title="UI Showcase"
      description="Live examples of the shared admin primitives. Use this page to verify styling when introducing new patterns."
      breadcrumbs={[
        { label: "Admin" },
        { label: "UI Showcase" },
      ]}
      actions={
        <Link
          href="/admin"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong"
        >
          Back to dashboard
        </Link>
      }
    >
      <AdminSection title="Metrics" description="Consistent stat blocks for key numbers.">
        <AdminMetricGrid>
          <AdminMetric label="Active properties" value={3} />
          <AdminMetric label="Pending approvals" value={2} description="Awaiting owner decision" />
          <AdminMetric label="Expiring documents" value={1} description="Action required" />
          <AdminMetric label="Upcoming maintenance" value={4} />
        </AdminMetricGrid>
      </AdminSection>

      <AdminSection
        title="Standard section"
        description="Use AdminSection for primary page modules. Supports actions and footers."
        actions={
          <div className="flex gap-2">
            <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:border-accent">
              Secondary
            </button>
            <button className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background transition hover:bg-accent-strong">
              Primary action
            </button>
          </div>
        }
        footer="Optional footers provide follow-up guidance."
      >
        <p className="text-sm text-muted-foreground">
          AdminSection handles heading spacing, button alignment, and optional footers for you. The body accepts arbitrary
          content or additional layout components.
        </p>
      </AdminSection>

      <AdminSection title="Cards & tables" description="Combine AdminCard and AdminTableContainer for detail layouts.">
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard title="Maintenance checklist" description="Quick reminder before hand-offs.">
            <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
              <li>Reset thermostat and water heaters</li>
              <li>Confirm cleaning crew arrival</li>
              <li>Stock welcome kit</li>
            </ul>
          </AdminCard>

          <AdminCard title="Notifications" muted>
            <p className="text-sm text-muted-foreground">
              Set notifications inside the owner profile. Muted cards are useful for secondary info, hints, or inline help.
            </p>
          </AdminCard>
        </div>

        <AdminTableContainer>
          <table className="w-full min-w-[32rem] divide-y divide-border text-left text-sm text-muted-foreground">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="py-3 pl-4 pr-3 font-medium text-foreground">Property</th>
                <th className="py-3 pr-3 font-medium">Lead owner</th>
                <th className="py-3 pr-3 font-medium">Nights</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {SAMPLE_ROWS.map((row) => (
                <tr key={row.name} className="transition hover:bg-background-muted">
                  <td className="py-3 pl-4 pr-3 font-medium text-foreground">{row.name}</td>
                  <td className="py-3 pr-3">{row.owner}</td>
                  <td className="py-3 pr-3 text-center">{row.nights}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.status === "Approved"
                          ? "bg-success/15 text-success-foreground"
                          : "bg-warning/15 text-warning-foreground"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableContainer>
      </AdminSection>
    </AdminPage>
  );
}
