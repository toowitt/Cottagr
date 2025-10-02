'use client';

import { useState, useEffect, useCallback } from 'react';

interface Day {
  date: string;
  available: boolean;
  nightlyRate?: number;
}

interface Property {
  id: number;
  name: string;
  nightlyRate: number;
  cleaningFee: number;
  minNights: number;
}

interface AvailabilityCalendarProps {
  propertyId: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function AvailabilityCalendar({ propertyId }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const fetchProperty = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties`);
      if (!response.ok) throw new Error('Failed to fetch property');
      const properties: Array<{
        id: number;
        name: string;
        nightlyRate: number;
        cleaningFee: number;
        minNights: number;
      }> = await response.json();
      const foundProperty = properties.find((p) => p.id === propertyId);
      if (foundProperty) {
        setProperty({
          id: foundProperty.id,
          name: foundProperty.name,
          nightlyRate: foundProperty.nightlyRate,
          cleaningFee: foundProperty.cleaningFee,
          minNights: foundProperty.minNights,
        });
      }
    } catch (error) {
      console.error('Error fetching property:', error);
    }
  }, [propertyId]);

  const fetchAvailability = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const endBoundary = new Date(year, month + 1, 1);

      const fromParam = firstDay.toISOString().split('T')[0];
      const toParam = endBoundary.toISOString().split('T')[0];

      const response = await fetch(
        `/api/availability?propertyId=${propertyId}&from=${fromParam}&to=${toParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      setDays(data.days || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setDays([]);
      addToast('Failed to load availability', 'error');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [currentMonth, fetchAvailability]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    setSelectedStart(null);
    setSelectedEnd(null);
  };

  const handleDayClick = (date: string, available: boolean) => {
    if (!available) return;

    if (!selectedStart) {
      setSelectedStart(date);
      setSelectedEnd(null);
    } else if (!selectedEnd) {
      if (date > selectedStart) {
        // Check if all days between start and end are available
        const startDate = new Date(selectedStart);
        const endDate = new Date(date);
        const currentDate = new Date(startDate);
        let allAvailable = true;

        while (currentDate <= endDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          const dayData = days.find(d => d.date === dateString);
          if (!dayData || !dayData.available) {
            allAvailable = false;
            break;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (allAvailable) {
          setSelectedEnd(date);
        } else {
          addToast('Selected range contains unavailable dates', 'error');
          setSelectedStart(date);
          setSelectedEnd(null);
        }
      } else {
        setSelectedStart(date);
        setSelectedEnd(null);
      }
    } else {
      setSelectedStart(date);
      setSelectedEnd(null);
    }
  };

  const calculateBookingDetails = () => {
    if (!selectedStart || !selectedEnd || !property) return null;

    const start = new Date(selectedStart);
    const end = new Date(selectedEnd);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate total nightly amount (using property's base rate for simplicity)
    const nightlyTotal = nights * property.nightlyRate;
    const total = nightlyTotal + property.cleaningFee;

    return {
      nights,
      nightlyRate: property.nightlyRate,
      cleaningFee: property.cleaningFee,
      nightlyTotal,
      total
    };
  };

  // Helper function to format cents to a currency string like "$X,XXX.YY"
  const formatCents = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleCreateBooking = async () => {
    if (!selectedStart || !selectedEnd || !property) return;

    setBookingStatus('loading');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          startDate: selectedStart,
          endDate: selectedEnd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      setBookingStatus('success');
      setSelectedStart(null);
      setSelectedEnd(null);
      addToast('Booking request submitted successfully!', 'success');

      // Refresh availability data
      await fetchAvailability(currentMonth);
    } catch (error) {
      setBookingStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Booking failed';
      addToast(errorMessage, 'error');
    }
  };

  const renderCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const cells = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Header row
    weekdays.forEach(day => {
      cells.push(
        <div key={day} className="p-2 text-center font-semibold text-gray-400 border-b border-gray-600">
          {day}
        </div>
      );
    });

    // Calendar days
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const dateString = cellDate.toISOString().split('T')[0];
      const isCurrentMonth = cellDate.getMonth() === month;
      const dayData = days.find(d => d.date === dateString);

      const isCheckIn = selectedStart === dateString;
      const isCheckOut = selectedEnd === dateString;
      const isSelected = isCheckIn || isCheckOut;
      const isInRange =
        selectedStart && selectedEnd && dateString > selectedStart && dateString < selectedEnd;
      const isUnavailable = isCurrentMonth && dayData && !dayData.available;
      const isClickable = isCurrentMonth && dayData && dayData.available;

      let classes = 'p-2 border min-h-[80px] transition-colors ';
      classes += isCurrentMonth ? 'border-gray-600 bg-gray-900 text-gray-100 ' : 'border-gray-700 bg-gray-800 text-gray-600 ';

      if (isUnavailable) {
        classes += 'border-rose-500/40 bg-rose-500/20 text-rose-100 cursor-not-allowed ';
      }

      if (isClickable) {
        classes += 'cursor-pointer hover:bg-emerald-500/25 ';
      }

      if (isInRange) {
        classes += 'bg-emerald-500/30 text-emerald-50 ';
      }

      if (isSelected) {
        classes += 'bg-emerald-500 text-white ring-2 ring-emerald-300 ';
      }

      cells.push(
        <div
          key={dateString}
          onClick={() => isClickable && handleDayClick(dateString, dayData?.available ?? false)}
          className={classes.trim()}
        >
          <div className="text-sm font-medium">{cellDate.getDate()}</div>
          {isCurrentMonth && dayData && dayData.available && property && (
            <div className="mt-1 text-xs text-emerald-200">
              ${(property.nightlyRate / 100).toFixed(0)}
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  const monthYear = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const bookingDetails = calculateBookingDetails();

  return (
    <div className="relative">
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold">{monthYear}</h3>
          <button
            onClick={() => navigateMonth('next')}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            →
          </button>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading availability...</div>
        ) : (
          <div className="grid grid-cols-7 gap-0 border border-gray-600 rounded">
            {renderCalendarGrid()}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 text-xs text-gray-400">
          <div className="flex space-x-4">
            <span>Click available dates to select check-in/out</span>
            <span className="line-through">Unavailable</span>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Booking Summary Sticky Footer */}
      {selectedStart && selectedEnd && bookingDetails && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 p-6 z-40">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              {/* Booking Details */}
              <div className="space-y-2">
                <div className="text-sm text-gray-300">
                  <strong>Check-in:</strong> {selectedStart} | <strong>Check-out:</strong> {selectedEnd}
                </div>
                <div className="text-sm text-gray-300">
                  <strong>Nights:</strong> {bookingDetails.nights}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>${(bookingDetails.nightlyRate / 100).toFixed(0)} × {bookingDetails.nights} nights</span>
                    <span>{formatCents(bookingDetails.nightlyTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cleaning fee</span>
                    <span>{formatCents(bookingDetails.cleaningFee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t border-gray-600 pt-1">
                    <span>Total</span>
                    <span>{formatCents(bookingDetails.total)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedStart(null);
                    setSelectedEnd(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBooking}
                  disabled={bookingStatus === 'loading'}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
                >
                  {bookingStatus === 'loading' ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer when booking summary is shown */}
      {selectedStart && selectedEnd && bookingDetails && (
        <div className="h-40"></div>
      )}
    </div>
  );
}
