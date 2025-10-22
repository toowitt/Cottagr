import Link from 'next/link';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import {
  setupAddOwner,
  setupCreateOrganization,
  setupCreateProperty,
  setupDeleteOrganization,
  setupDeleteProperty,
  setupDetachProperty,
  setupRemoveOwnership,
  setupUpdateOwnership,
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
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Owner setup</h1>
        <p className="text-sm text-slate-400">
          Build your ownership group, connect properties, and keep owners in sync from one place.
        </p>
      </header>

      {successMessage ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section id="organizations" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">1. Organizations</h2>
          <p className="text-sm text-slate-400">
            Start with the ownership group. Everything else—properties, bookings, voting—stays organized inside it.
          </p>
        </div>

        <form action={setupCreateOrganization} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Organization name
            </span>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Black Point Owners"
            />
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Slug (optional)</span>
            <input
              type="text"
              name="slug"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="black-point-owners"
            />
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

        {organizations.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm text-slate-300">
            No organizations yet. Create one above to get started.
          </p>
        ) : (
          <div className="space-y-6">
            {organizations.map((organization) => (
              <article
                key={organization.id}
                className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-inner shadow-black/20"
              >
                <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">{organization.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-500">/{organization.slug}</p>
                    <p className="text-xs text-slate-500">
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
                      className="text-xs text-rose-300 hover:text-rose-200"
                      confirmText="Delete this organization? Detach properties first."
                    >
                      Delete organization
                    </ConfirmSubmitButton>
                  </form>
                </header>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Properties</h4>
                  {organization.properties.length === 0 ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                      No properties attached yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {organization.properties.map((property) => (
                        <li
                          key={property.id}
                          className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium text-white">{property.name}</p>
                            <p className="text-xs text-slate-400">{property.location ?? 'Location TBD'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/setup?editProperty=${property.id}#properties`}
                              className="text-xs text-blue-400 transition hover:text-blue-300"
                            >
                              Edit property
                            </Link>
                            <form action={setupDetachProperty.bind(null, property.id)}>
                              <ConfirmSubmitButton
                                className="text-xs text-amber-300 hover:text-amber-200"
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
      </section>

      <section id="properties" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">2. Properties</h2>
          <p className="text-sm text-slate-400">
            Add cottages and keep their rates, rules, and descriptions in sync.
          </p>
        </div>

        {hasOrganizations ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-lg font-semibold text-white">
              {propertyToEdit ? `Edit ${propertyToEdit.name}` : 'Create a property'}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Slugs generate automatically if you leave them blank.
            </p>

            <form
              action={propertyToEdit ? setupUpdateProperty.bind(null, propertyToEdit.id) : setupCreateProperty}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <label className="text-sm text-slate-300 md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Organization
                </span>
                <select
                  name="organizationId"
                  defaultValue={propertyToEdit?.organizationId ?? organizations[0]?.id ?? ''}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Name</span>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={propertyToEdit?.name ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Slug</span>
                <input
                  type="text"
                  name="slug"
                  defaultValue={propertyToEdit?.slug ?? ''}
                  placeholder="black-point-cottage"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Location</span>
                <input
                  type="text"
                  name="location"
                  defaultValue={propertyToEdit?.location ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Beds</span>
                <input
                  type="number"
                  name="beds"
                  min="0"
                  defaultValue={propertyToEdit?.beds ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Baths</span>
                <input
                  type="number"
                  name="baths"
                  min="0"
                  defaultValue={propertyToEdit?.baths ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nightly rate (cents)
                </span>
                <input
                  type="number"
                  name="nightlyRate"
                  min="0"
                  required
                  defaultValue={propertyToEdit?.nightlyRate ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Cleaning fee (cents)
                </span>
                <input
                  type="number"
                  name="cleaningFee"
                  min="0"
                  required
                  defaultValue={propertyToEdit?.cleaningFee ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Minimum nights
                </span>
                <input
                  type="number"
                  name="minNights"
                  min="1"
                  required
                  defaultValue={propertyToEdit?.minNights ?? 2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="md:col-span-2 text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Description</span>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={propertyToEdit?.description ?? ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <label className="md:col-span-2 text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Photos (comma separated URLs)
                </span>
                <input
                  type="text"
                  name="photos"
                  defaultValue={Array.isArray(propertyToEdit?.photos) ? propertyToEdit?.photos.join(', ') : ''}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>

              <div className="flex items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  {propertyToEdit ? 'Save changes' : 'Create property'}
                </button>
                {propertyToEdit ? (
                  <Link
                    href="/admin/setup#properties"
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                  >
                    Cancel edit
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm text-slate-300">
            Create an organization first to add properties.
          </p>
        )}

        {hasProperties ? (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-sm text-slate-200">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Property</th>
                  <th className="px-5 py-3 text-left">Nightly rate</th>
                  <th className="px-5 py-3 text-left">Organization</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{property.name}</div>
                      <div className="text-xs text-slate-400">{property.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {currency.format(property.nightlyRate / 100)}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {organizations.find((org) => org.id === property.organizationId)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <Link
                          href={`/admin/setup?editProperty=${property.id}#properties`}
                          className="text-blue-400 transition hover:text-blue-300"
                        >
                          Edit
                        </Link>
                        <form action={setupDeleteProperty.bind(null, property.id)}>
                          <ConfirmSubmitButton
                            className="text-rose-300 hover:text-rose-200"
                            confirmText="Delete this property? This also removes owners and bookings."
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                        <Link
                          href={`/${property.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-300 transition hover:text-emerald-200"
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
      </section>

      <section id="owners" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">3. Owners</h2>
          <p className="text-sm text-slate-400">
            Invite owners or caretakers, set their share, and track voting power in one view.
          </p>
        </div>

        {!hasProperties ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm text-slate-300">
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
                  className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-inner shadow-black/20"
                >
                  <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{property.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {((shareTotal / 10000) * 100).toFixed(2)}% allocated · {property.ownerships.length}{' '}
                        owner{property.ownerships.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Link
                      href={`/admin/setup?editProperty=${property.id}#properties`}
                      className="text-xs text-blue-400 transition hover:text-blue-300"
                    >
                      Edit property details →
                    </Link>
                  </header>

                  <div className="grid gap-6 md:grid-cols-2">
                    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Add an owner
                      </h4>
                      <form action={setupAddOwner} className="grid gap-3">
                        <input type="hidden" name="propertyId" value={property.id} />
                        <label className="text-sm text-slate-300">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Email
                          </span>
                          <input
                            type="email"
                            name="email"
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="owner@example.com"
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm text-slate-300">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                              First name
                            </span>
                            <input
                              type="text"
                              name="firstName"
                              required
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </label>
                          <label className="text-sm text-slate-300">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Last name
                            </span>
                            <input
                              type="text"
                              name="lastName"
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm text-slate-300">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Share (basis points)
                            </span>
                            <input
                              type="number"
                              name="shareBps"
                              min="0"
                              max="10000"
                              required
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="4000"
                            />
                          </label>
                          <label className="text-sm text-slate-300">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Voting power
                            </span>
                            <input
                              type="number"
                              name="votingPower"
                              min="0"
                              required
                              defaultValue={1}
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </label>
                        </div>
                        <label className="text-sm text-slate-300">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Role
                          </span>
                          <select
                            name="role"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="PRIMARY">Primary</option>
                            <option value="OWNER">Owner</option>
                            <option value="CARETAKER">Caretaker</option>
                          </select>
                        </label>
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
                        >
                          Add owner to {property.name}
                        </button>
                      </form>
                    </section>

                    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Current owners
                      </h4>
                      {property.ownerships.length === 0 ? (
                        <p className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
                          No owners yet. Add one from the form.
                        </p>
                      ) : (
                        <ul className="space-y-3 text-sm text-slate-200">
                          {property.ownerships.map((ownership) => {
                            const isEditing = editOwnerId === ownership.id;
                            const focusParam = `owners-${property.id}`;
                            const focusQuery = `focus=${encodeURIComponent(focusParam)}`;

                            return (
                              <li
                                key={ownership.id}
                                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner shadow-black/20"
                              >
                                <div className="flex flex-col gap-2 border-b border-slate-800 pb-3 text-slate-100 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="font-semibold">
                                      {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                                    </p>
                                    <p className="text-xs text-slate-400">{ownership.owner.email}</p>
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Share {(ownership.shareBps / 100).toFixed(2)}% · Power {ownership.votingPower}
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                  {isEditing ? (
                                    <form
                                      action={setupUpdateOwnership.bind(null, ownership.id)}
                                      className="grid flex-1 gap-3 md:grid-cols-6"
                                    >
                                      <input type="hidden" name="propertyId" value={property.id} />
                                      <label className="text-xs text-slate-400">
                                        <span className="mb-1 block uppercase tracking-wide">First name</span>
                                        <input
                                          type="text"
                                          name="firstName"
                                          defaultValue={ownership.owner.firstName ?? ''}
                                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                          required
                                        />
                                      </label>
                                      <label className="text-xs text-slate-400">
                                        <span className="mb-1 block uppercase tracking-wide">Last name</span>
                                        <input
                                          type="text"
                                          name="lastName"
                                          defaultValue={ownership.owner.lastName ?? ''}
                                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                      </label>
                                      <label className="text-xs text-slate-400">
                                        <span className="mb-1 block uppercase tracking-wide">Email</span>
                                        <input
                                          type="email"
                                          name="email"
                                          defaultValue={ownership.owner.email}
                                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                          required
                                        />
                                      </label>
                                      <label className="text-xs text-slate-400">
                                        <span className="mb-1 block uppercase tracking-wide">Share (bps)</span>
                                        <input
                                          type="number"
                                          name="shareBps"
                                          min="0"
                                          max="10000"
                                          defaultValue={ownership.shareBps}
                                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                      </label>
                                      <label className="text-xs text-slate-400">
                                        <span className="mb-1 block uppercase tracking-wide">Power</span>
                                        <input
                                          type="number"
                                          name="votingPower"
                                          min="0"
                                          defaultValue={ownership.votingPower}
                                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                      </label>
                                      <label className="text-xs text-slate-400">
                                        <span className="mb-1 block uppercase tracking-wide">Role</span>
                                        <select
                                          name="role"
                                          defaultValue={ownership.role}
                                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                          <option value="PRIMARY">Primary</option>
                                          <option value="OWNER">Owner</option>
                                          <option value="CARETAKER">Caretaker</option>
                                        </select>
                                      </label>
                                      <div className="flex items-end gap-2">
                                        <button
                                          type="submit"
                                          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                                        >
                                          Save
                                        </button>
                                        <Link
                                          href={`/admin/setup?${focusQuery}`}
                                          className="w-full rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-100"
                                        >
                                          Cancel
                                        </Link>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="grid gap-2 text-xs text-slate-300 md:grid-cols-3">
                                        <span>
                                          Share: <strong>{(ownership.shareBps / 100).toFixed(2)}%</strong>
                                        </span>
                                        <span>
                                          Voting power: <strong>{ownership.votingPower}</strong>
                                        </span>
                                        <span>
                                          Role: <strong>{ownership.role}</strong>
                                        </span>
                                      </div>
                                      <div className="flex gap-2 md:justify-end">
                                        <Link
                                          href={`/admin/setup?${focusQuery}&editOwner=${ownership.id}`}
                                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                                        >
                                          Edit owner
                                        </Link>
                                      </div>
                                    </div>
                                  )}

                                  <form action={setupRemoveOwnership.bind(null, ownership.id)} className="md:self-end">
                                    <input type="hidden" name="propertyId" value={property.id} />
                                    <ConfirmSubmitButton
                                      className="text-xs text-rose-300 hover:text-rose-200"
                                      confirmText="Remove this owner from the property?"
                                    >
                                      Remove
                                    </ConfirmSubmitButton>
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
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-white">Next steps</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Invite owners and guests (coming soon)</li>
          <li>Configure booking rules and blackout periods</li>
          <li>Upload knowledge hub documents</li>
        </ul>
      </section>
    </div>
  );
}
