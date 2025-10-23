'use client';

import { notFound } from 'next/navigation';

if (process.env.NODE_ENV === 'production') {
  notFound();
}
import { AppShell } from '@/components/navigation/AppShell';
import { Container, PageHeader, ResponsiveGrid } from '@/components/ui';
import {
  ResponsiveTable,
  type ResponsiveColumn,
  type RowAction,
} from '@/components/datagrid/ResponsiveTable';

type DemoRow = {
  id: string;
  guest: string;
  property: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: 'Confirmed' | 'Pending' | 'Draft';
};

const rows: DemoRow[] = [
  {
    id: '1',
    guest: 'The Martins',
    property: 'Lakehouse North',
    checkIn: '2024-07-12',
    checkOut: '2024-07-16',
    nights: 4,
    status: 'Confirmed',
  },
  {
    id: '2',
    guest: 'Ferguson family',
    property: 'Cedar Grove',
    checkIn: '2024-07-19',
    checkOut: '2024-07-22',
    nights: 3,
    status: 'Pending',
  },
  {
    id: '3',
    guest: 'Regina Miles',
    property: 'Harbourview Loft',
    checkIn: '2024-07-26',
    checkOut: '2024-07-29',
    nights: 3,
    status: 'Draft',
  },
];

const columns: ResponsiveColumn<DemoRow>[] = [
  {
    id: 'guest',
    header: 'Guest',
    priority: 'high',
    sticky: true,
    renderCell: (row) => <span className="font-medium">{row.guest}</span>,
    mobileLabel: 'Guest',
  },
  {
    id: 'property',
    header: 'Property',
    priority: 'high',
    renderCell: (row) => row.property,
    mobileLabel: 'Property',
  },
  {
    id: 'checkIn',
    header: 'Check-in',
    priority: 'medium',
    renderCell: (row) => new Date(row.checkIn).toLocaleDateString(),
    mobileLabel: 'Check-in',
  },
  {
    id: 'checkOut',
    header: 'Check-out',
    priority: 'medium',
    renderCell: (row) => new Date(row.checkOut).toLocaleDateString(),
    mobileLabel: 'Check-out',
  },
  {
    id: 'nights',
    header: 'Nights',
    priority: 'low',
    align: 'end',
    renderCell: (row) => (
      <span className="tabular-nums text-muted-foreground">{row.nights}</span>
    ),
    mobileLabel: 'Nights',
  },
  {
    id: 'status',
    header: 'Status',
    priority: 'medium',
    renderCell: (row) => (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-default px-3 py-1 text-xs font-semibold uppercase tracking-wide"
        data-status={row.status}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
        {row.status}
      </span>
    ),
    mobileLabel: 'Status',
  },
];

const navItems = [
  { href: '/responsive-test', name: 'Dashboard', icon: 'menu' },
  { href: '#bookings', name: 'Bookings', icon: 'calendar' },
  { href: '#owners', name: 'Owners', icon: 'owners' },
  { href: '#property', name: 'Properties', icon: 'home' },
  { href: '/admin/blog', name: 'Blog', icon: 'blog' },
  { href: '#tasks', name: 'Tasks', icon: 'checklist' },
];

const actions = [
  {
    id: 'view',
    label: 'View',
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
  },
  {
    id: 'cancel',
    label: 'Cancel',
    destructive: true,
  },
] satisfies RowAction<DemoRow>[];

export default function ResponsiveTestPage() {
  return (
    <AppShell
      title={<span className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Cottagr Preview</span>}
      navItems={navItems}
      actions={
        <button
          type="button"
          className="touch-target hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 md:inline-flex"
        >
          New booking
        </button>
      }
    >
      <PageHeader
        title="Responsive system preview"
        description="This internal screen exercises navigation, responsive tables, and primary action layout across breakpoints."
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { label: 'Responsive preview' },
        ]}
        primaryAction={
          <button
            type="button"
            className="touch-target rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background shadow-soft transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Add booking
          </button>
        }
        secondaryAction={
          <button
            type="button"
            className="touch-target rounded-full border border-default px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Export
          </button>
        }
      >
        <ResponsiveGrid columns={{ base: 1, md: 3 }} gap="md">
          <div className="rounded-2xl border border-default bg-background p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next stay</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">July 12 – 16</p>
          </div>
          <div className="rounded-2xl border border-default bg-background p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Occupancy</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">78%</p>
          </div>
          <div className="rounded-2xl border border-default bg-background p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner votes</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">12 pending</p>
          </div>
        </ResponsiveGrid>
      </PageHeader>

      <Container className="py-10">
        <ResponsiveTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          actions={(row) =>
            actions.map((action) => ({
              ...action,
              onSelect:
                action.id === 'view'
                  ? () => window.alert(`Viewing ${row.guest}`)
                  : action.id === 'duplicate'
                    ? () => window.alert(`Duplicating ${row.guest}`)
                    : () => window.alert(`Cancelling ${row.guest}`),
            }))
          }
        />
      </Container>
    </AppShell>
  );
}
