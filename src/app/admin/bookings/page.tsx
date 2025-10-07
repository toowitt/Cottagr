
'use client';

import { useState, useEffect } from 'react';
import { confirmBooking, cancelBooking, deleteBooking, createQuickBooking, createQuickBlackout } from './actions';

interface Property {
  id: number;
  name: string;
  slug: string;
  location: string;
  nightlyRate: number;
  cleaningFee: number;
  minNights: number;
}

interface Booking {
  id: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  guestName: string;
  guestEmail: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  property: {
    id: number;
    name: string;
    slug: string;
    location?: string;
  } | null;
}

export default function AdminBookingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick create form state
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    type: 'booking', // 'booking' or 'blackout'
    startDate: '',
    endDate: '',
    guestName: '',
    reason: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchBookings(selectedPropertyId);
    } else {
      fetchAllBookings();
    }
  }, [selectedPropertyId]);

  async function fetchProperties() {
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error('Failed to fetch properties');
      const data = await response.json();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function fetchBookings(propertyId: number) {
    try {
      const response = await fetch(`/api/bookings?propertyId=${propertyId}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      const bookingsData = Array.isArray(data)
        ? data
        : Array.isArray(data?.bookings)
          ? data.bookings
          : null;

      if (!bookingsData) {
        throw new Error('Invalid bookings response');
      }

      setBookings(bookingsData);
    } catch (err) {
      setBookings([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    }
  }

  async function fetchAllBookings() {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      const bookingsData = Array.isArray(data)
        ? data
        : Array.isArray(data?.bookings)
          ? data.bookings
          : null;

      if (!bookingsData) {
        throw new Error('Invalid bookings response');
      }

      setBookings(bookingsData);
    } catch (err) {
      setBookings([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    }
  }

  async function handleConfirm(bookingId: number) {
    try {
      const formData = new FormData();
      formData.append('id', bookingId.toString());
      await confirmBooking(formData);
      
      // Refresh bookings
      if (selectedPropertyId) {
        await fetchBookings(selectedPropertyId);
      } else {
        await fetchAllBookings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
    }
  }

  async function handleCancel(bookingId: number) {
    try {
      const formData = new FormData();
      formData.append('id', bookingId.toString());
      await cancelBooking(formData);
      
      // Refresh bookings
      if (selectedPropertyId) {
        await fetchBookings(selectedPropertyId);
      } else {
        await fetchAllBookings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    }
  }

  async function handleDelete(bookingId: number) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      const formData = new FormData();
      formData.append('id', bookingId.toString());
      await deleteBooking(formData);
      
      // Refresh bookings
      if (selectedPropertyId) {
        await fetchBookings(selectedPropertyId);
      } else {
        await fetchAllBookings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    }
  }

  async function handleQuickCreate() {
    if (!selectedPropertyId || !quickFormData.startDate || !quickFormData.endDate) {
      setError('Please select a property and fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('propertyId', selectedPropertyId.toString());
      formData.append('startDate', quickFormData.startDate);
      formData.append('endDate', quickFormData.endDate);

      if (quickFormData.type === 'booking') {
        formData.append('guestName', quickFormData.guestName || 'Owner/Manual Block');
        await createQuickBooking(formData);
      } else {
        formData.append('reason', quickFormData.reason || 'Manual Block');
        await createQuickBlackout(formData);
      }

      // Reset form and refresh
      setQuickFormData({
        type: 'booking',
        startDate: '',
        endDate: '',
        guestName: '',
        reason: ''
      });
      setShowQuickForm(false);

      if (selectedPropertyId) {
        await fetchBookings(selectedPropertyId);
      } else {
        await fetchAllBookings();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Bookings Management</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <button
          onClick={() => setShowQuickForm(!showQuickForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Quick Create
        </button>
      </div>

      {error && (
        <div className="bg-red-800 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* Property Filter */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter by Property</h2>
        <select
          value={selectedPropertyId || ''}
          onChange={(e) => setSelectedPropertyId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full p-2 border rounded text-black bg-white"
        >
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} - {property.location}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Create Form */}
      {showQuickForm && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Create</h2>
          
          {!selectedPropertyId && (
            <p className="text-yellow-400 mb-4">Please select a property first</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={quickFormData.type}
                onChange={(e) => setQuickFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2 border rounded text-black bg-white"
              >
                <option value="booking">Manual Booking</option>
                <option value="blackout">Blackout Period</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={quickFormData.startDate}
                onChange={(e) => setQuickFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 border rounded text-black bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={quickFormData.endDate}
                onChange={(e) => setQuickFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 border rounded text-black bg-white"
              />
            </div>

            {quickFormData.type === 'booking' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Guest Name</label>
                <input
                  type="text"
                  value={quickFormData.guestName}
                  onChange={(e) => setQuickFormData(prev => ({ ...prev, guestName: e.target.value }))}
                  placeholder="Owner/Manual Block"
                  className="w-full p-2 border rounded text-black bg-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input
                  type="text"
                  value={quickFormData.reason}
                  onChange={(e) => setQuickFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Manual Block"
                  className="w-full p-2 border rounded text-black bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleQuickCreate}
              disabled={!selectedPropertyId}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Create {quickFormData.type === 'booking' ? 'Booking' : 'Blackout'}
            </button>
            <button
              onClick={() => setShowQuickForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const propertyDetails =
                    booking.property ??
                    properties.find((property) => property.id === booking.propertyId) ??
                    null;

                  return (
                    <tr key={booking.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {propertyDetails?.name ?? 'Unknown property'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{booking.guestName}</div>
                        <div className="text-sm text-gray-400">{booking.guestEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-400">
                          {Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24))} nights
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        ${(booking.totalAmount / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleConfirm(booking.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Confirm
                          </button>
                        )}
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
