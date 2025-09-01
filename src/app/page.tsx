
import Link from "next/link";
import { prisma } from '@/lib/prisma';
import { formatCents } from '@/lib/money';

export default async function Home() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CottageMaster</h1>
          <p className="text-lg text-gray-400">Shared cottage management app</p>
          <div className="mt-6">
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
            >
              Admin Panel
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          {/* Properties Grid */}
          {properties.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold mb-6">Available Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {properties.map((property) => (
                  <div key={property.id} className="bg-gray-800 rounded-lg overflow-hidden">
                    {/* Hero Image Placeholder */}
                    <div className="h-48 bg-gray-700 flex items-center justify-center">
                      {property.photos && Array.isArray(property.photos) && property.photos.length > 0 ? (
                        <img
                          src={property.photos[0] as string}
                          alt={property.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`text-gray-400 text-center ${property.photos && Array.isArray(property.photos) && property.photos.length > 0 ? 'hidden' : ''}`}>
                        <div className="text-4xl mb-2">🏡</div>
                        <div>No Photo Available</div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-2">{property.name}</h3>
                      {property.location && (
                        <p className="text-gray-400 mb-2">{property.location}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-300">
                        {property.beds && <span>{property.beds} beds</span>}
                        {property.baths && <span>{property.baths} baths</span>}
                      </div>
                      
                      <p className="text-gray-300 mb-4 line-clamp-2">
                        {property.description || 'Beautiful cottage rental property.'}
                      </p>
                      
                      <div className="mb-4">
                        <span className="text-2xl font-bold text-green-400">
                          {formatCents(property.nightlyRate)}
                        </span>
                        <span className="text-gray-400">/night</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link
                          href={`/${property.slug}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md transition-colors"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/admin/properties?edit=${property.id}`}
                          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏡</div>
              <h2 className="text-2xl font-bold mb-4">No Properties Yet</h2>
              <p className="text-gray-400 mb-6">
                Get started by adding your first property in the admin panel.
              </p>
              <Link
                href="/admin/properties"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
              >
                Add Your First Property
              </Link>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Management</h2>
              <p className="text-gray-400 mb-4">Access the admin panel to manage properties and bookings</p>
              <Link
                href="/admin"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Admin Panel
              </Link>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Bookings</h2>
              <p className="text-gray-400 mb-4">View and manage current reservations</p>
              <Link
                href="/bookings"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                View Bookings
              </Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500">
              Next.js 14.2.5 + Prisma + SQLite
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
