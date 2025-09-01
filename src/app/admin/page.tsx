
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/properties"
          className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Properties</h2>
          <p className="text-gray-400">Manage property listings and details</p>
        </Link>
        <Link
          href="/admin/calendar"
          className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Calendar</h2>
          <p className="text-gray-400">View and manage availability</p>
        </Link>
        <Link
          href="/admin/bookings"
          className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Bookings</h2>
          <p className="text-gray-400">Review and manage reservations</p>
        </Link>
      </div>
    </div>
  );
}
