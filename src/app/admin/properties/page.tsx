import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { prisma } from '@/lib/prisma';
import { createProperty, updateProperty, deleteProperty } from './actions';
import PropertyForm from './PropertyForm';

interface SearchParams {
  edit?: string;
  success?: string;
  error?: string;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const editId = searchParams.edit ? parseInt(searchParams.edit, 10) : null;

  let editProperty: Awaited<ReturnType<typeof prisma.property.findUnique>> | null = null;
  if (editId) {
    editProperty = await prisma.property.findUnique({ where: { id: editId } });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Properties</h1>
      </div>

      {searchParams.success && (
        <div className="mb-6 rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-100">
          {searchParams.success === 'created' && 'Property created successfully!'}
          {searchParams.success === 'updated' && 'Property updated successfully!'}
          {searchParams.success === 'deleted' && 'Property deleted successfully!'}
        </div>
      )}

      {searchParams.error && (
        <div className="mb-6 rounded border border-rose-500/40 bg-rose-500/10 p-4 text-rose-100">
          <span className="font-semibold">Error:</span> {searchParams.error}
        </div>
      )}

      <div className="mb-8 rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-semibold">
          {editProperty ? 'Edit Property' : 'Add New Property'}
        </h2>

        <PropertyForm
          key={editProperty ? `edit-${editProperty.id}` : 'create'}
          mode={editProperty ? 'edit' : 'create'}
          action={editProperty ? updateProperty.bind(null, editProperty.id) : createProperty}
          initialValues={
            editProperty
              ? {
                  id: editProperty.id,
                  name: editProperty.name,
                  slug: editProperty.slug,
                  location: editProperty.location,
                  beds: editProperty.beds,
                  baths: editProperty.baths,
                  nightlyRate: editProperty.nightlyRate,
                  cleaningFee: editProperty.cleaningFee,
                  minNights: editProperty.minNights,
                  description: editProperty.description,
                  photos: Array.isArray(editProperty.photos)
                    ? (editProperty.photos as string[])
                    : null,
                }
              : undefined
          }
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-gray-800">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Nightly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {properties.map((property) => (
              <tr key={property.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-white">{property.name}</div>
                    <div className="text-sm text-gray-400">{property.location}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{property.slug}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                  ${(property.nightlyRate / 100).toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium space-x-2">
                  <a
                    href={`/admin/properties?edit=${property.id}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </a>
                  <form action={deleteProperty.bind(null, property.id)} className="inline">
                    <ConfirmSubmitButton
                      className="text-rose-400 hover:text-rose-300"
                      confirmText="Are you sure you want to delete this property?"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                  <a
                    href={`/${property.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {properties.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400">
            No properties found. Add one above to get started.
          </div>
        )}
      </div>
    </div>
  );
}
