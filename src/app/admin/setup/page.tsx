import Link from 'next/link';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { AdminPage, AdminSection, AdminCard } from '@/components/ui/AdminPage';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { basisPointsToPercent, formatShare } from '@/lib/share';
import {
  setupAddOwner,
  setupCreateOrganization,
  setupCreateProperty,
  setupDeleteOrganization,
  setupDeleteProperty,
  setupDetachProperty,
  setupRemoveOwnership,
  setupUpdateOwnership,
  setupUpdateOwnershipPreferences,
  setupUpdateProperty,
} from './actions';

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const successMessages: Record<string, string> = {
  'organization-created': 'Organization created.',
  'organization-deleted': 'Organization deleted.',
  'property-created': 'Property created.',
  'property-updated': 'Property updated.',
  'property-deleted': 'Property deleted.',
  'property-detached': 'Property detached from organization.',
  'owner-added': 'Owner added.',
  'owner-removed': 'Owner removed.',
  'ownership-updated': 'Owner updated.',
  'ownership-preferences-updated': 'Owner preferences updated.',
};

interface SetupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const successKey = typeof params.success === 'string' ? params.success : undefined;
  const errorMessage = typeof params.error === 'string' ? params.error : undefined;
  const editPropertyId = typeof params.editProperty === 'string' ? parseInt(params.editProperty, 10) : null;
  const editOwnerId = typeof params.editOwner === 'string' ? parseInt(params.editOwner, 10) : null;
  const organizationNameParam = typeof params.name === 'string' ? params.name : undefined;

  const supabase = await createServerSupabaseClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/setup');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/setup');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminMemberships = memberships.filter((membership) => membership.role === 'OWNER_ADMIN');
  const organizationIds = adminMemberships.map((membership) => membership.organizationId);

  const organizations = await prisma.organization.findMany({
    where: {
      id: { in: organizationIds.length > 0 ? organizationIds : [0] },
    },
    orderBy: { name: 'asc' },
    include: {
      properties: {
        orderBy: { name: 'asc' },
        include: {
          ownerships: {
            orderBy: { createdAt: 'asc' },
            include: {
              owner: true,
            },
          },
        },
      },
    },
  });

  const properties = organizations.flatMap((organization) => organization.properties);
  const propertyToEdit = editPropertyId ? properties.find((property) => property.id === editPropertyId) ?? null : null;
  const showPropertyForm = (Array.isArray(params.showPropertyForm) ? params.showPropertyForm[0] : params.showPropertyForm) === 'true' || Boolean(propertyToEdit);

  if (editPropertyId && !propertyToEdit) {
    redirect('/admin/setup?error=Property%20not%20available&focus=properties');
  }

  const successMessage = successKey
    ? successKey === 'organization-created' && organizationNameParam
      ? `Created ${organizationNameParam}`
      : successMessages[successKey] ?? successKey
    : undefined;

  const hasOrganizations = organizations.length > 0;
  const hasProperties = properties.length > 0;

  return (
    <AdminPage
      title="Owner setup"
      description="Build your ownership group, connect properties, and keep owners in sync from one place."
    >

      {successMessage ? (
        <AdminSection subdued>
          <p className="text-sm text-emerald-600 dark:text-emerald-300">{successMessage}</p>
        </AdminSection>
      ) : null}

      {errorMessage ? (
        <AdminSection subdued>
          <p className="text-sm text-destructive">{errorMessage}</p>
        </AdminSection>
      ) : null}

      <div id="organizations" className="space-y-6">
        <AdminSection
          title="1. Organizations"
          description="Start with the ownership group. Everything else—properties, bookings, voting—stays organized inside it."
        >
          <AdminCard>
            <form action={setupCreateOrganization} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Organization name
                </span>
                <Input
                  type="text"
                  name="name"
                  required
                  placeholder="Black Point Owners"
                />
              </label>
              <label className="text-sm text-muted-foreground">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Slug (optional)
                </span>
                <Input type="text" name="slug" placeholder="black-point-owners" />
              </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              Create organization
            </button>
          </div>
        </form>
          </AdminCard>

          {organizations.length === 0 ? (
            <p className="rounded-2xl border border-border/60 bg-surface px-4 py-5 text-sm text-muted-foreground">
              No organizations yet. Create one above to get started.
            </p>
          ) : (
          <div className="space-y-6">
            {organizations.map((organization) => (
              <article
                key={organization.id}
                className="space-y-5 rounded-3xl border border-border/60 bg-surface p-6 shadow-soft"
              >
                <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground">{organization.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">/{organization.slug}</p>
                    <p className="text-xs text-muted-foreground">
                      {organization.properties.length} property
                      {organization.properties.length === 1 ? '' : 'ies'} ·{' '}
                      {organization.properties.reduce((total, property) => total + property.ownerships.length, 0)} owner
                      {organization.properties.reduce((total, property) => total + property.ownerships.length, 0) === 1
                        ? ''
                        : 's'}
                    </p>
                  </div>
                  <form action={setupDeleteOrganization.bind(null, organization.id)}>
                    <ConfirmSubmitButton
                      className="text-xs text-destructive hover:text-destructive/80"
                      confirmText="Delete this organization? Detach properties first."
                    >
                      Delete organization
                    </ConfirmSubmitButton>
                  </form>
                </header>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">Properties</h4>
                  {organization.properties.length === 0 ? (
                    <p className="rounded-xl border border-border/50 bg-background px-4 py-3 text-sm text-muted-foreground">
                      No properties attached yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {organization.properties.map((property) => (
                        <li
                          key={property.id}
                          className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background px-4 py-3 text-sm text-foreground md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium text-foreground">{property.name}</p>
                            <p className="text-xs text-muted-foreground">{property.location ?? 'Location TBD'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/setup?editProperty=${property.id}#properties`}
                              className="text-xs font-semibold text-primary transition hover:text-primary/80"
                            >
                              Edit property
                            </Link>
                            <form action={setupDetachProperty.bind(null, property.id)}>
                              <ConfirmSubmitButton
                                className="text-xs text-warning hover:text-warning/80"
                                confirmText="Detach this property from the organization?"
                              >
                                Detach
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
          )}
        </AdminSection>
      </div>

      <div id="properties" className="space-y-6">
        <AdminSection
          title="2. Properties"
          description="Add cottages and keep their rates, rules, and descriptions in sync."
        >
          {hasOrganizations ? (
            <AdminCard>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Properties</h3>
                  <p className="text-sm text-muted-foreground">
                    Slugs generate automatically if you leave them blank.
                  </p>
                </div>
                <Link
                  href={showPropertyForm ? '/admin/setup#properties' : '/admin/setup?showPropertyForm=true#properties'}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {showPropertyForm ? 'Close form' : 'Add property'}
                </Link>
              </div>

              {showPropertyForm ? (
                <form
                  action={propertyToEdit ? setupUpdateProperty.bind(null, propertyToEdit.id) : setupCreateProperty}
                  className="mt-5 grid gap-4 md:grid-cols-2"
                >
                <label className="text-sm text-muted-foreground md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Organization
                  </span>
                  <select
                    name="organizationId"
                    defaultValue={propertyToEdit?.organizationId ?? organizations[0]?.id ?? ''}
                    required
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Name
                  </span>
                  <Input type="text" name="name" required defaultValue={propertyToEdit?.name ?? ''} />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Slug
                  </span>
                  <Input
                    type="text"
                    name="slug"
                    defaultValue={propertyToEdit?.slug ?? ''}
                    placeholder="black-point-cottage"
                  />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Location
                  </span>
                  <Input type="text" name="location" defaultValue={propertyToEdit?.location ?? ''} />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Beds
                  </span>
                  <Input type="number" name="beds" min="0" defaultValue={propertyToEdit?.beds ?? ''} />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Baths
                  </span>
                  <Input type="number" name="baths" min="0" defaultValue={propertyToEdit?.baths ?? ''} />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Nightly rate
                  </span>
                  <Input
                    type="number"
                    name="nightlyRate"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="325.00"
                    required
                    defaultValue={
                      propertyToEdit ? (propertyToEdit.nightlyRate / 100).toString() : ''
                    }
                  />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Cleaning fee
                  </span>
                  <Input
                    type="number"
                    name="cleaningFee"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="150.00"
                    required
                    defaultValue={
                      propertyToEdit ? (propertyToEdit.cleaningFee / 100).toString() : ''
                    }
                  />
                </label>

                <label className="text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Minimum nights
                  </span>
                  <Input
                    type="number"
                    name="minNights"
                    min="1"
                    required
                    defaultValue={propertyToEdit?.minNights ?? 2}
                  />
                </label>

                <label className="md:col-span-2 text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Description
                  </span>
                  <Textarea name="description" rows={3} defaultValue={propertyToEdit?.description ?? ''} />
                </label>

                <label className="md:col-span-2 text-sm text-muted-foreground">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Photos (comma separated URLs)
                  </span>
                  <Input
                    type="text"
                    name="photos"
                    defaultValue={Array.isArray(propertyToEdit?.photos) ? propertyToEdit?.photos.join(', ') : ''}
                  />
                </label>

                <div className="flex items-center gap-3 md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {propertyToEdit ? 'Save changes' : 'Create property'}
                  </button>
                  {propertyToEdit ? (
                    <Link
                      href="/admin/setup#properties"
                      className="rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-accent hover:text-accent"
                    >
                      Cancel edit
                    </Link>
                  ) : null}
                </div>
              </form>
            ) : null}
            </AdminCard>
          ) : (
            <p className="rounded-2xl border border-border/60 bg-surface px-4 py-5 text-sm text-muted-foreground">
              Create an organization first to add properties.
            </p>
          )}

          {hasProperties ? (
            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background">
              <table className="w-full text-sm text-foreground">
                <thead className="bg-background-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Property</th>
                  <th className="px-5 py-3 text-left">Nightly rate</th>
                  <th className="px-5 py-3 text-left">Organization</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{property.name}</div>
                      <div className="text-xs text-muted-foreground">{property.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {currency.format(property.nightlyRate / 100)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {organizations.find((org) => org.id === property.organizationId)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <Link
                          href={`/admin/setup?editProperty=${property.id}#properties`}
                          className="text-primary transition hover:text-primary/80"
                        >
                          Edit
                        </Link>
                        <form action={setupDeleteProperty.bind(null, property.id)}>
                          <ConfirmSubmitButton
                            className="text-destructive hover:text-destructive/80"
                            confirmText="Delete this property? This also removes owners and bookings."
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                        <Link
                          href={`/${property.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary transition hover:text-primary/80"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </AdminSection>
      </div>

      <div id="owners" className="space-y-6">
        <AdminSection
          title="3. Owners"
          description="Invite owners or caretakers, set their share, and track voting power in one view."
        >
          {!hasProperties ? (
            <p className="rounded-2xl border border-border/60 bg-surface px-4 py-5 text-sm text-muted-foreground">
              Add a property before assigning owners.
            </p>
          ) : (
            <div className="space-y-6">
            {properties.map((property) => {
              const shareTotal = property.ownerships.reduce((sum, ownership) => sum + ownership.shareBps, 0);
              return (
                <article
                  key={property.id}
                  id={`owners-${property.id}`}
                  className="space-y-6 rounded-3xl border border-border/40 bg-surface p-6 shadow-soft"
                >
                  <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{property.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {formatShare(shareTotal)} allocated · {property.ownerships.length}{' '}
                        owner{property.ownerships.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Link
                      href={`/admin/setup?editProperty=${property.id}#properties`}
                      className="text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      Edit property details →
                    </Link>
                  </header>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <section className="space-y-4 rounded-2xl bg-background p-5 ring-1 ring-border/15">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">
                        Add an owner
                      </h4>
                      <form action={setupAddOwner} className="grid gap-3">
                        <input type="hidden" name="propertyId" value={property.id} />
                        <label className="text-sm text-muted-foreground">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Email
                          </span>
                          <Input type="email" name="email" required placeholder="owner@example.com" />
                        </label>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <label className="text-sm text-muted-foreground">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                              First name
                            </span>
                            <Input type="text" name="firstName" required />
                          </label>
                          <label className="text-sm text-muted-foreground">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                              Last name
                            </span>
                            <Input type="text" name="lastName" />
                          </label>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <label className="text-sm text-muted-foreground">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                              Share (%)
                            </span>
                            <Input
                              type="number"
                              name="sharePercent"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              placeholder="33.33"
                            />
                          </label>
                          <label className="text-sm text-muted-foreground">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                              Voting power
                            </span>
                            <Input type="number" name="votingPower" min="0" required defaultValue={1} />
                          </label>
                        </div>
                        <label className="text-sm text-muted-foreground">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Role
                          </span>
                          <select
                            name="role"
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option value="PRIMARY">Primary</option>
                            <option value="OWNER">Owner</option>
                            <option value="CARETAKER">Caretaker</option>
                          </select>
                        </label>
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                          Add owner to {property.name}
                        </button>
                      </form>
                    </section>

                    <section className="space-y-3 rounded-2xl bg-background p-5 ring-1 ring-border/15">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">
                        Current owners
                      </h4>
                      {property.ownerships.length === 0 ? (
                        <p className="rounded-xl border border-border/60 bg-background-muted px-4 py-3 text-sm text-muted-foreground">
                          No owners yet. Add one from the form.
                        </p>
                      ) : (
                        <ul className="space-y-3 text-sm text-foreground">
                          {property.ownerships.map((ownership) => {
                            const isEditing = editOwnerId === ownership.id;
                            const focusParam = `owners-${property.id}`;
                            const focusQuery = `focus=${encodeURIComponent(focusParam)}`;

                            return (
                              <li
                                key={ownership.id}
                                id={`owners-${property.id}-${ownership.id}`}
                                className="rounded-xl bg-background p-4 shadow-soft ring-1 ring-border/15"
                              >
                                <div className="flex flex-col gap-2 border-b border-border/60 pb-3 text-foreground md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="font-semibold">
                                      {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{ownership.owner.email}</p>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Share {formatShare(ownership.shareBps)} · Power {ownership.votingPower}
                                  </div>
                                </div>

                                <div className="mt-3 space-y-4">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    {isEditing ? (
                                      <form
                                        action={setupUpdateOwnership.bind(null, ownership.id)}
                                        className="flex-1 space-y-4"
                                      >
                                        <input type="hidden" name="propertyId" value={property.id} />
                                        <div className="grid gap-3 lg:grid-cols-2">
                                          <label className="text-xs text-muted-foreground">
                                            <span className="mb-1 block uppercase tracking-wide">First name</span>
                                            <Input
                                              type="text"
                                              name="firstName"
                                              defaultValue={ownership.owner.firstName ?? ''}
                                              required
                                            />
                                          </label>
                                          <label className="text-xs text-muted-foreground">
                                            <span className="mb-1 block uppercase tracking-wide">Last name</span>
                                            <Input type="text" name="lastName" defaultValue={ownership.owner.lastName ?? ''} />
                                          </label>
                                          <label className="text-xs text-muted-foreground sm:col-span-2">
                                            <span className="mb-1 block uppercase tracking-wide">Email</span>
                                            <Input type="email" name="email" defaultValue={ownership.owner.email} required />
                                          </label>
                                          <label className="text-xs text-muted-foreground sm:col-span-2">
                                            <span className="mb-1 block uppercase tracking-wide">Share (%)</span>
                                            <Input
                                              type="number"
                                              name="sharePercent"
                                              min="0"
                                              max="100"
                                              step="0.01"
                                              defaultValue={basisPointsToPercent(ownership.shareBps)}
                                            />
                                          </label>
                                          <label className="text-xs text-muted-foreground">
                                            <span className="mb-1 block uppercase tracking-wide">Power</span>
                                            <Input type="number" name="votingPower" min="0" defaultValue={ownership.votingPower} />
                                          </label>
                                          <label className="text-xs text-muted-foreground">
                                            <span className="mb-1 block uppercase tracking-wide">Role</span>
                                            <select
                                              name="role"
                                              defaultValue={ownership.role}
                                              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                                            >
                                              <option value="PRIMARY">Primary</option>
                                              <option value="OWNER">Owner</option>
                                              <option value="CARETAKER">Caretaker</option>
                                            </select>
                                          </label>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                          <button
                                            type="submit"
                                            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                                          >
                                            Save
                                          </button>
                                          <Link
                                            href={`/admin/setup?${focusQuery}#owners-${property.id}-${ownership.id}`}
                                            className="rounded-lg border border-border/60 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-accent hover:text-accent"
                                          >
                                            Cancel
                                          </Link>
                                        </div>
                                      </form>
                                    ) : (
                                      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="grid gap-2 text-xs text-muted-foreground lg:grid-cols-3">
                                          <span>
                                            Share: <strong>{formatShare(ownership.shareBps)}</strong>
                                          </span>
                                          <span>
                                            Voting power: <strong>{ownership.votingPower}</strong>
                                          </span>
                                          <span>
                                            Role: <strong>{ownership.role}</strong>
                                          </span>
                                        </div>
                                        <div className="flex gap-2 lg:justify-end">
                                          <Link
                                            href={`/admin/setup?${focusQuery}&editOwner=${ownership.id}#owners-${property.id}-${ownership.id}`}
                                            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                                          >
                                            Edit owner
                                          </Link>
                                        </div>
                                      </div>
                                    )}

                                    <form action={setupRemoveOwnership.bind(null, ownership.id)} className="md:self-end">
                                      <input type="hidden" name="propertyId" value={property.id} />
                                      <ConfirmSubmitButton
                                        className="text-xs text-destructive hover:text-destructive/80"
                                        confirmText="Remove this owner from the property?"
                                      >
                                        Remove
                                      </ConfirmSubmitButton>
                                    </form>
                                  </div>

                                  <form
                                    action={setupUpdateOwnershipPreferences.bind(null, ownership.id)}
                                    className="grid gap-4 rounded-2xl bg-background-muted px-4 py-4 ring-1 ring-border/15 lg:grid-cols-2"
                                  >
                                    <input type="hidden" name="propertyId" value={property.id} />
                                    <fieldset className="space-y-3">
                                      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                                        Booking participation
                                      </legend>
                                      <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-xs text-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)]">
                                        <input
                                          type="checkbox"
                                          name="bookingApprover"
                                          defaultChecked={ownership.bookingApprover}
                                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-accent"
                                        />
                                        <span>Approve booking requests</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-xs text-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)]">
                                        <input
                                          type="checkbox"
                                          name="autoSkipBookings"
                                          defaultChecked={ownership.autoSkipBookings}
                                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-accent"
                                        />
                                        <span>Skip booking approvals by default</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-xs text-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)]">
                                        <input
                                          type="checkbox"
                                          name="notifyOnBookings"
                                          defaultChecked={ownership.notifyOnBookings}
                                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-accent"
                                        />
                                        <span>Notify about booking activity</span>
                                      </label>
                                    </fieldset>
                                    <fieldset className="space-y-3">
                                      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                                        Expense & maintenance
                                      </legend>
                                      <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-xs text-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)]">
                                        <input
                                          type="checkbox"
                                          name="expenseApprover"
                                          defaultChecked={ownership.expenseApprover}
                                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-accent"
                                        />
                                        <span>Approve expenses</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-xs text-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)]">
                                        <input
                                          type="checkbox"
                                          name="notifyOnExpenses"
                                          defaultChecked={ownership.notifyOnExpenses}
                                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-accent"
                                        />
                                        <span>Notify about expense activity</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-xs text-foreground shadow-[0_0_0_1px_rgba(148,163,184,0.2)]">
                                        <input
                                          type="checkbox"
                                          name="blackoutManager"
                                          defaultChecked={ownership.blackoutManager}
                                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-accent"
                                        />
                                        <span>Allow blackout management</span>
                                      </label>
                                    </fieldset>
                                    <div className="sm:col-span-2 flex justify-end">
                                      <button
                                        type="submit"
                                        className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                                      >
                                        Save preferences
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
          )}
        </AdminSection>
      </div>

      <AdminSection title="Next steps">
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Invite owners and guests (coming soon)</li>
          <li>Configure booking rules and blackout periods</li>
          <li>Upload knowledge hub documents</li>
        </ul>
      </AdminSection>
    </AdminPage>
  );
}
