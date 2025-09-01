
'use client';

import { useState, useEffect } from 'react';

interface Day {
  date: string;
  available: boolean;
  nightlyRate: number;
}

interface AvailabilityCalendarProps {
  propertyId: number;
}

export default function AvailabilityCalendar({ propertyId }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchAvailability = async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const nextDay = new Date(lastDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const fromParam = firstDay.toISOString().split('T')[0];
      const toParam = nextDay.toISOString().split('T')[0];

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [currentMonth, propertyId]);

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
        setSelectedEnd(date);
      } else {
        setSelectedStart(date);
        setSelectedEnd(null);
      }
    } else {
      setSelectedStart(date);
      setSelectedEnd(null);
    }
  };

  const handleBookingRequest = async () => {
    if (!selectedStart || !selectedEnd) return;
    
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
      // Refresh availability data
      fetchAvailability(currentMonth);
    } catch (error) {
      setBookingStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Booking failed');
    }
  };

  const renderCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
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
      
      const isSelected = selectedStart === dateString || selectedEnd === dateString;
      const isInRange = selectedStart && selectedEnd && 
        dateString > selectedStart && dateString < selectedEnd;

      cells.push(
        <div
          key={dateString}
          onClick={() => isCurrentMonth && dayData && handleDayClick(dateString, dayData.available)}
          className={`
            p-2 border border-gray-600 min-h-[80px] cursor-pointer
            ${!isCurrentMonth ? 'text-gray-600 bg-gray-800' : ''}
            ${dayData && !dayData.available ? 'bg-gray-700 line-through text-gray-500' : ''}
            ${dayData && dayData.available ? 'hover:bg-gray-600' : ''}
            ${isSelected ? 'bg-blue-600' : ''}
            ${isInRange ? 'bg-blue-400' : ''}
          `}
        >
          <div className="text-sm font-medium">{cellDate.getDate()}</div>
          {isCurrentMonth && dayData && (
            <div className="text-xs mt-1">
              ${(dayData.nightlyRate / 100).toFixed(0)}
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

  return (
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

      {/* Selection Info */}
      {selectedStart && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <div className="text-sm">
            <strong>Check-in:</strong> {selectedStart}
            {selectedEnd && (
              <>
                <br />
                <strong>Check-out:</strong> {selectedEnd}
              </>
            )}
          </div>
        </div>
      )}

      {/* Booking Button */}
      {selectedStart && selectedEnd && (
        <button
          onClick={handleBookingRequest}
          disabled={bookingStatus === 'loading'}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded transition-colors"
        >
          {bookingStatus === 'loading' ? 'Requesting...' : 'Request to Book'}
        </button>
      )}

      {/* Status Messages */}
      {bookingStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-800 text-green-200 rounded">
          Booking request submitted successfully!
        </div>
      )}
      {bookingStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-800 text-red-200 rounded">
          Error: {errorMessage}
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
  );
}
