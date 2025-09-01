import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CottageMaster</h1>
          <p className="text-lg text-gray-600">Shared cottage management app</p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Properties</h2>
              <p className="text-gray-600 mb-4">Manage your cottage properties</p>
              <Link
                href="/api/properties"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                View Properties API
              </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Bookings</h2>
              <p className="text-gray-600 mb-4">View and manage bookings</p>
              <div className="space-x-4">
                <Link
                  href="/bookings"
                  className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Bookings Page
                </Link>
                <Link
                  href="/api/bookings"
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Bookings API
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-500">
              Next.js 14.2.5 + Prisma + SQLite
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}