import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { assignExistingOwner, createOwnerAndAssign, deleteOwnership } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

interface SearchParams {
  propertyId?: string;
  success?: string;
  error?: string;
}

export default async function OwnersPage({ searchParams }: { searchParams: SearchParams }) {
  const [properties, owners] = await Promise.all([
    prisma.property.findMany({
      orderBy: { name: 'asc' },
      include: {
        ownerships: {
          orderBy: { createdAt: 'asc' },
          include: {
            owner: true,
          },
        },
      },
    }),
    prisma.owner.findMany({
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ]);

  const requestedPropertyId = Number(searchParams.propertyId);
  const selectedProperty =
    properties.find((property) => property.id === requestedPropertyId) ?? properties[0];

  const selectedPropertyId = selectedProperty?.id;

  const assignedOwnerIds = new Set(selectedProperty?.ownerships.map((o) => o.ownerId) ?? []);
  const availableOwners = owners.filter((owner) => !assignedOwnerIds.has(owner.id));

  const shareTotal = selectedProperty?.ownerships.reduce((sum, ownership) => sum + ownership.shareBps, 0) ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Owners</h1>
          <p className="mt-2 text-sm text-slate-400">
            Add owners to a property, set their share (basis points out of 10,000), and define voting power.
          </p>
        </div>
        <Link href="/admin/properties" className="text-sm text-blue-400 hover:text-blue-300">
          Manage properties →
        </Link>
      </div>

      {searchParams.success && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {searchParams.success === 'created' && 'Owner added and assigned successfully.'}
          {searchParams.success === 'assigned' && 'Owner assigned to property.'}
          {searchParams.success === 'deleted' && 'Owner removed from property.'}
        </div>
      )}

      {searchParams.error && (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {searchParams.error}
        </div>
      )}

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
          Add a property first so you can assign owners.
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-slate-100">Select property</h2>
            <p className="mt-1 text-sm text-slate-400">
              Choose which property you’re updating. Everything below reflects the selected property.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {properties.map((property) => {
                const isActive = property.id === selectedPropertyId;
                return (
                  <Link
                    key={property.id}
                    href={`/admin/owners?propertyId=${property.id}`}
                    className={`rounded-xl px-4 py-2 text-sm transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-blue-500'
                    }`}
                  >
                    {property.name}
                  </Link>
                );
              })}
            </div>
          </section>

          {selectedPropertyId ? (
            <>
              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
                  <h2 className="text-lg font-semibold text-slate-100">Add new owner</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Create an owner and immediately assign their share to {selectedProperty?.name}.
                  </p>
                  <form action={createOwnerAndAssign} className="mt-6 grid gap-4">
                    <input type="hidden" name="propertyId" value={selectedPropertyId} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          First name
                        </span>
                        <input
                          type="text"
                          name="firstName"
                          required
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Last name
                        </span>
                        <input
                          type="text"
                          name="lastName"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                    <label className="text-sm text-slate-300">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </span>
                      <input
                        type="email"
                        name="email"
                        required
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                          placeholder="e.g., 3333"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                          placeholder="e.g., 1"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                    >
                      Add owner to {selectedProperty?.name}
                    </button>
                  </form>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
                  <h2 className="text-lg font-semibold text-slate-100">Assign existing owner</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Pull in an owner you’ve already created and set their share for this property.
                  </p>
                  {availableOwners.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
                      All owners are already assigned to this property. Add a new owner above to continue.
                    </p>
                  ) : (
                    <form action={assignExistingOwner} className="mt-6 grid gap-4">
                      <input type="hidden" name="propertyId" value={selectedPropertyId} />
                      <label className="text-sm text-slate-300">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Owner
                        </span>
                        <select
                          name="ownerId"
                          required
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">Select owner…</option>
                          {availableOwners.map((owner) => (
                            <option key={owner.id} value={owner.id}>
                              {owner.firstName} {owner.lastName ?? ''} · {owner.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
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
                            placeholder="e.g., 3333"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                            placeholder="e.g., 1"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                      >
                        Assign owner to {selectedProperty?.name}
                      </button>
                    </form>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Current owners for {selectedProperty?.name}</h2>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Allocated {((shareTotal / 10000) * 100).toFixed(2)}% of 100%
                    </p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {selectedProperty?.ownerships.length ?? 0} owner
                    {(selectedProperty?.ownerships.length ?? 0) === 1 ? '' : 's'} assigned
                  </p>
                </div>

                {selectedProperty?.ownerships.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
                    No owners assigned yet. Add one above to get started.
                  </p>
                ) : (
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    {selectedProperty?.ownerships.map((ownership) => (
                      <li
                        key={ownership.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 shadow-inner shadow-black/30 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-100">
                            {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                          </p>
                          <p className="text-xs text-slate-400">{ownership.owner.email}</p>
                          <p className="text-xs text-slate-500">
                            Share {(ownership.shareBps / 100).toFixed(2)}% · Power {ownership.votingPower}
                          </p>
                        </div>
                        <form action={deleteOwnership} className="self-start sm:self-center">
                          <input type="hidden" name="id" value={ownership.id} />
                          <input type="hidden" name="propertyId" value={selectedPropertyId} />
                          <ConfirmSubmitButton
                            className="text-sm text-rose-300 hover:text-rose-200"
                            confirmText="Remove this owner from the property?"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
              Select a property above to manage its owners.
            </section>
          )}
        </>
      )}
    </div>
  );
}
