
import { prisma } from '@/lib/prisma';
import { createBlackout, deleteBlackout } from './actions';

export default async function AdminBlackoutsPage() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Blackout Management</h1>
      
      {/* Property Selection Form */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Blackout</h2>
        <form action={createBlackout} className="space-y-4">
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium mb-2">
              Property
            </label>
            <select
              id="propertyId"
              name="propertyId"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-2">
              Reason (optional)
            </label>
            <input
              type="text"
              id="reason"
              name="reason"
              placeholder="e.g., Maintenance, Personal use"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
          </div>
          
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Create Blackout
          </button>
        </form>
      </div>

      {/* Blackouts List */}
      <BlackoutsList properties={properties} />
    </div>
  );
}

async function BlackoutsList({ properties }: { properties: { id: number; name: string }[] }) {
  const blackouts = await prisma.blackout.findMany({
    include: {
      property: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { startDate: 'desc' },
    ],
  });

  if (blackouts.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Active Blackouts</h2>
        <p className="text-gray-400">No blackouts found.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Active Blackouts</h2>
      <div className="space-y-4">
        {blackouts.map((blackout) => (
          <div key={blackout.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{blackout.property.name}</h3>
              <p className="text-gray-300">
                {new Date(blackout.startDate).toLocaleDateString()} - {new Date(blackout.endDate).toLocaleDateString()}
              </p>
              {blackout.reason && (
                <p className="text-sm text-gray-400 mt-1">Reason: {blackout.reason}</p>
              )}
            </div>
            <form action={deleteBlackout} className="ml-4">
              <input type="hidden" name="id" value={blackout.id} />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition-colors"
                onClick={(e) => {
                  if (!confirm('Are you sure you want to delete this blackout?')) {
                    e.preventDefault();
                  }
                }}
              >
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
