import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check environment variables
  if (process.env.SINGLE_TENANT !== "true" || !process.env.ADMIN_PASSWORD) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-6 bg-gray-800 rounded-lg">
          <h1 className="text-xl font-bold mb-4">Configuration Required</h1>
          <p className="text-gray-300 mb-4">
            To use the admin panel, please set:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>SINGLE_TENANT="true"</li>
            <li>ADMIN_PASSWORD="your-secure-password"</li>
          </ul>
        </div>
      </div>
    );
  }

  // Check authentication - only redirect if not authenticated
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth');

  if (!authCookie || authCookie.value !== 'ok') {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin" className="text-xl font-bold">
              CottageMaster Admin
            </Link>
            <div className="flex space-x-6">
              <Link
                href="/admin/properties"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Properties
              </Link>
              <Link
                href="/admin/calendar"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Calendar
              </Link>
              <Link
                href="/admin/bookings"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Bookings
              </Link>
              <Link
                href="/"
                className="text-gray-400 hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}