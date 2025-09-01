import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { prisma } from '@/lib/prisma';
import { createProperty, updateProperty, deleteProperty } from './actions';

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

  const editId = searchParams.edit ? parseInt(searchParams.edit) : null;

  let editProperty: Awaited<ReturnType<typeof prisma.property.findUnique>> | null = null;
  if (editId) {
    editProperty = await prisma.property.findUnique({ where: { id: editId } });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Properties</h1>
      </div>

      {/* Status Messages */}
      {searchParams.success && (
        <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded text-green-300">
          {searchParams.success === 'created' && 'Property created successfully!'}
          {searchParams.success === 'updated' && 'Property updated successfully!'}
          {searchParams.success === 'deleted' && 'Property deleted successfully!'}
        </div>
      )}

      {searchParams.error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded text-red-300">
          <span className="font-semibold">Error:</span> {searchParams.error}
        </div>
      )}

      {/* Property Form */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editProperty ? 'Edit Property' : 'Add New Property'}
        </h2>

        <form action={editProperty ? updateProperty.bind(null, editProperty.id) : createProperty}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                name="name"
                defaultValue={editProperty?.name || ''}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <input
                type="text"
                name="slug"
                defaultValue={editProperty?.slug || ''}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                defaultValue={editProperty?.location || ''}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Beds</label>
              <input
                type="number"
                name="beds"
                defaultValue={editProperty?.beds ?? ''}
                min="0"
                step="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Baths</label>
              <input
                type="number"
                name="baths"
                defaultValue={editProperty?.baths ?? ''}
                min="0"
                step="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nightly Rate (cents)</label>
              <input
                type="number"
                name="nightlyRate"
                defaultValue={editProperty?.nightlyRate ?? ''}
                required
                min="0"
                step="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cleaning Fee (cents)</label>
              <input
                type="number"
                name="cleaningFee"
                defaultValue={editProperty?.cleaningFee ?? ''}
                required
                min="0"
                step="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum Nights</label>
              <input
                type="number"
                name="minNights"
                defaultValue={editProperty?.minNights ?? 2}
                required
                min="1"
                step="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              defaultValue={editProperty?.description || ''}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Photos (comma-separated URLs)</label>
            <input
              type="text"
              name="photos"
              defaultValue={
                editProperty?.photos
                  ? Array.isArray(editProperty.photos)
                    ? (editProperty.photos as string[]).join(', ')
                    : ''
                  : ''
              }
              placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {editProperty ? 'Update Property' : 'Create Property'}
            </button>

            {editProperty && (
              <a
                href="/admin/properties"
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </a>
            )}
          </div>
        </form>
      </div>

      {/* Properties List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Nightly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {properties.map((property) => (
              <tr key={property.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white">{property.name}</div>
                    <div className="text-sm text-gray-400">{property.location}</div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {property.slug}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  ${(property.nightlyRate / 100).toFixed(2)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <a
                    href={`/admin/properties?edit=${property.id}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </a>

                  <form action={deleteProperty.bind(null, property.id)} className="inline">
                    <ConfirmSubmitButton
                      className="text-red-400 hover:text-red-300"
                      confirmText="Are you sure you want to delete this property?"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>

                  <a
                    href={`/${property.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300"
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
