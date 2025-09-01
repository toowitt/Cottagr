
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  // Pull first/featured property if present
  const property = await prisma.property.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 p-10">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Shared cottage management, without the spreadsheets.
          </h1>
          <p className="mt-4 text-gray-300">
            Block owner time, track bookings, and keep everyone in sync—built
            for a single cottage (yours) with room to grow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/bookings"
              className="inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-white"
            >
              Check availability
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white"
            >
              Owner Login
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="grid gap-6 md:grid-cols-3">
        {[
          { title: 'Calendar & Blackouts', body: 'See availability at a glance and block owner time in seconds.' },
          { title: 'Manual Bookings', body: 'Capture requests, avoid overlaps, and confirm when you're ready.' },
          { title: 'Single-Tenant First', body: 'Designed for one property now, with a path to multi-user later.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-300">{f.body}</p>
          </div>
        ))}
      </section>

      {/* FEATURED PROPERTY */}
      <section id="property" className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Your Cottage</h2>
            {property ? (
              <>
                <p className="mt-1 text-gray-300">
                  {property.name}
                  {property.location ? ` — ${property.location}` : ''}
                </p>
                <p className="mt-4 text-sm text-gray-300">
                  {property.description || 'A cozy retreat on the coast.'}
                </p>
                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/${property.slug}`}
                    className="inline-flex items-center rounded-md bg-gray-700 hover:bg-gray-600 px-4 py-2"
                  >
                    View details
                  </Link>
                  <Link
                    href="/bookings"
                    className="inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-white"
                  >
                    See calendar
                  </Link>
                  <Link
                    href={`/admin/properties?edit=${property.id}`}
                    className="inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white"
                  >
                    Manage
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-gray-300">
                  No property set up yet. Add one to get started.
                </p>
                <div className="mt-4">
                  <Link
                    href="/admin/properties"
                    className="inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white"
                  >
                    Add property
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* simple photo panel */}
          <div className="w-full md:w-80 aspect-[4/3] rounded-xl border border-gray-800 bg-gray-800/40 grid place-items-center text-gray-400">
            {Array.isArray(property?.photos) && (property!.photos as any[]).length > 0 ? (
              <img
                src={(property!.photos as string[])[0]}
                alt={property!.name}
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <div className="text-sm">No Photo Available</div>
            )}
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
        <h3 className="text-xl font-semibold">
          Ready to simplify cottage scheduling?
        </h3>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/bookings"
            className="rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-white"
          >
            Open calendar
          </Link>
          <Link
            href="/admin"
            className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white"
          >
            Owner login
          </Link>
        </div>
      </section>
    </div>
  );
}
