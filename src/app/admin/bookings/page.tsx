
'use client';

import { useState, useEffect, useCallback, Fragment, FormEvent } from 'react';
import type { BookingParticipantInput } from '@/lib/validation';
import { confirmBooking, cancelBooking, deleteBooking, createQuickBooking, createQuickBlackout } from './actions';
interface PropertyOwnership {
  id: number;
  role: string;
  shareBps: number;
  votingPower: number;
  ownerProfile: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

interface Property {
  id: number;
  name: string;
  slug: string;
  location: string;
  nightlyRate: number;
  cleaningFee: number;
  minNights: number;
  ownerships: PropertyOwnership[];
}

interface BookingUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface BookingOwnerInfo {
  ownershipId: number;
  role: string;
  shareBps: number;
  votingPower: number;
  ownerProfile: BookingUser | null;
}

interface BookingParticipantInfo {
  id: number;
  role: string;
  displayName: string;
  email: string | null;
  nights: number;
  user: BookingUser | null;
  ownership: BookingOwnerInfo | null;
}

interface BookingTimelineEventInfo {
  id: number;
  type: string;
  message: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    user: BookingUser | null;
    ownership: BookingOwnerInfo | null;
  };
}

interface BookingUsageSnapshotInfo {
  id: number;
  participantRole: string;
  participantKey: string;
  season: string;
  nights: number;
  calculatedAt: string;
}

interface Booking {
  id: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  guestName: string | null;
  guestEmail: string | null;
  status: string;
  totalAmount: number;
  totalFormatted: string;
  submittedAt: string | null;
  decisionAt: string | null;
  createdAt: string;
  updatedAt: string;
  decisionSummary: string | null;
  requestNotes: string | null;
  policySnapshot: Record<string, unknown> | null;
  property: {
    id: number;
    name: string;
    slug: string;
    location?: string | null;
  } | null;
  createdBy: BookingOwnerInfo | null;
  requestor: BookingOwnerInfo | null;
  requestorUser: BookingUser | null;
  participants: BookingParticipantInfo[];
  timeline: BookingTimelineEventInfo[];
  usageSnapshots: BookingUsageSnapshotInfo[];
  votes: {
    id: number;
    choice: 'approve' | 'reject' | 'abstain';
    ownershipId: number;
    createdAt: string;
    rationale: string | null;
    ownerProfile: BookingUser | null;
    ownership: {
      role: string;
      votingPower: number;
      shareBps: number;
    };
  }[];
}

export default function AdminBookingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [availability, setAvailability] = useState<{
    days: { date: string; available: boolean }[];
    items: {
      type: 'booking' | 'blackout';
      id: number;
      startDate: string;
      endDate: string;
      title: string;
      subtitle?: string;
      status?: string;
    }[];
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Quick create form state
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    type: 'booking', // 'booking' or 'blackout'
    startDate: '',
    endDate: '',
    guestName: '',
    reason: ''
  });
  const [showRequestComposer, setShowRequestComposer] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    propertyId: 0,
    startDate: '',
    endDate: '',
    guestName: '',
    guestEmail: '',
    notes: '',
    ownershipIds: [] as number[],
  });
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [votingOwnershipId, setVotingOwnershipId] = useState<number | null>(null);
  const [votingSubmittingId, setVotingSubmittingId] = useState<number | null>(null);
  const selectedFilterProperty = selectedPropertyId
    ? properties.find((property) => property.id === selectedPropertyId) ?? null
    : null;
  const pendingRequests = bookings.filter((booking) => booking.status === 'pending');
  const calendarCells = buildCalendarCells(calendarMonth, availability);
  const goToPreviousMonth = goToPreviousMonthHandler(setCalendarMonth);
  const goToNextMonth = goToNextMonthHandler(setCalendarMonth);
  const handleCalendarItemClick = useCallback(
    (item: CalendarCell['items'][number]) => {
      if (item.type !== 'booking') {
        return;
      }

      const matchingBooking = bookings.find((candidate) => candidate.id === item.id);
      if (!matchingBooking) {
        return;
      }

      if (selectedPropertyId !== matchingBooking.propertyId) {
        setSelectedPropertyId(matchingBooking.propertyId);
      }

      setRangeAnchor(null);
      setViewMode('list');
      setExpandedBookingId(matchingBooking.id);
    },
    [bookings, selectedPropertyId, setSelectedPropertyId, setExpandedBookingId, setRangeAnchor, setViewMode],
  );

  const handleCalendarCellClick = useCallback(
    (cell: CalendarCell) => {
      const bookingItem = cell.items.find((entry) => entry.type === 'booking');
      if (bookingItem) {
        handleCalendarItemClick(bookingItem);
        return;
      }

      if (!cell.available) {
        return;
      }

      const isoDate = formatISODate(cell.date);
      setShowRequestComposer(true);
      setExpandedBookingId(null);
      setViewMode('calendar');

      if (!rangeAnchor) {
        setRequestFormData((prev) => ({
          ...prev,
          startDate: isoDate,
          endDate: isoDate,
        }));
        setRangeAnchor(isoDate);
        return;
      }

      const [start, end] = rangeAnchor <= isoDate ? [rangeAnchor, isoDate] : [isoDate, rangeAnchor];
      setRequestFormData((prev) => ({
        ...prev,
        startDate: start,
        endDate: end,
      }));
      setRangeAnchor(null);
    },
    [handleCalendarItemClick, rangeAnchor, setExpandedBookingId, setRangeAnchor, setRequestFormData, setShowRequestComposer, setViewMode],
  );

  const roleLabels: Record<string, string> = {
    OWNER: 'Owner',
    FAMILY: 'Family',
    GUEST: 'Guest',
    CARETAKER: 'Caretaker',
    SERVICE: 'Service provider',
  };

  const eventLabels: Record<string, string> = {
    request_created: 'Request created',
    request_updated: 'Request updated',
    vote_cast: 'Vote cast',
    status_changed: 'Status changed',
    auto_action: 'Automatic action',
    note: 'Note',
  };

  const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');
  function formatISODate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  interface CalendarCell {
    date: Date;
    iso: string;
    inCurrentMonth: boolean;
    isToday: boolean;
    available: boolean;
    items: {
      type: 'booking' | 'blackout';
      id: number;
      title: string;
      subtitle?: string;
      status?: string;
    }[];
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function buildCalendarCells(
    month: Date,
    availability: {
      days: { date: string; available: boolean }[];
      items: {
        type: 'booking' | 'blackout';
        id: number;
        startDate: string;
        endDate: string;
        title: string;
        subtitle?: string;
        status?: string;
      }[];
    } | null,
  ): CalendarCell[] {
    const cells: CalendarCell[] = [];
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const startWeekday = startOfMonth.getDay();
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - startWeekday);

    const todayIso = formatISODate(new Date());

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const iso = formatISODate(date);

      const available = availability?.days.find((entry) => entry.date === iso)?.available ?? true;
      const itemsForDay = availability?.items.filter((item) => {
        const start = item.startDate.slice(0, 10);
        const end = item.endDate.slice(0, 10);
        return iso >= start && iso < end;
      }) ?? [];

      cells.push({
        date,
        iso,
        inCurrentMonth: date.getMonth() === month.getMonth(),
        isToday: iso === todayIso,
        available,
        items: itemsForDay.map((item) => ({
          type: item.type,
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          status: item.status,
        })),
      });
    }

    return cells;
  }

  function goToPreviousMonthHandler(setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>) {
    return () => {
      setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
  }

  function goToNextMonthHandler(setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>) {
    return () => {
      setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };
  }

  const getVotingSummary = (
    booking: Booking,
    property: Property | null,
  ) => {
    if (!property) {
      return {
        total: 0,
        approvals: 0,
        rejections: 0,
        threshold: 0,
      };
    }

    const total = property.ownerships.reduce((sum, ownership) => sum + ownership.votingPower, 0);
    const approvals = booking.votes
      .filter((vote) => vote.choice === 'approve')
      .reduce((sum, vote) => sum + vote.ownership.votingPower, 0);
    const rejections = booking.votes
      .filter((vote) => vote.choice === 'reject')
      .reduce((sum, vote) => sum + vote.ownership.votingPower, 0);
    const threshold = Math.floor(total / 2) + 1;

    return {
      total,
      approvals,
      rejections,
      threshold,
    };
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchAvailability = useCallback(async (propertyId: number, referenceMonth: Date) => {
    try {
      setAvailabilityLoading(true);
      setAvailabilityError(null);

      const from = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
      const to = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 1);

      const url = `/api/availability?propertyId=${propertyId}&from=${formatISODate(from)}&to=${formatISODate(to)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      const data = await response.json();
      setAvailability({
        days: Array.isArray(data?.days) ? data.days : [],
        items: Array.isArray(data?.items) ? data.items : [],
      });
    } catch (err) {
      setAvailability(null);
      setAvailabilityError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchBookings(selectedPropertyId);
      fetchAvailability(selectedPropertyId, calendarMonth);
    } else {
      fetchAllBookings();
      setAvailability(null);
    }
  }, [selectedPropertyId, calendarMonth, fetchAvailability]);

  useEffect(() => {
    if (properties.length === 0) return;

    setRequestFormData((prev) => {
      if (prev.propertyId && properties.some((property) => property.id === prev.propertyId)) {
        return prev;
      }

      const defaultProperty = properties[0];
      const defaultOwnershipIds = defaultProperty.ownerships.length
        ? [defaultProperty.ownerships[0].id]
        : [];

      setVotingOwnershipId((current) => current ?? (defaultOwnershipIds[0] ?? null));

      return {
        ...prev,
        propertyId: defaultProperty.id,
        ownershipIds: defaultOwnershipIds,
      };
    });
  }, [properties]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setVotingOwnershipId(null);
      return;
    }

    const property = properties.find((candidate) => candidate.id === selectedPropertyId);
    if (!property) {
      setVotingOwnershipId(null);
      return;
    }

    setVotingOwnershipId((current) => {
      if (current && property.ownerships.some((ownership) => ownership.id === current)) {
        return current;
      }
      return property.ownerships[0]?.id ?? null;
    });
  }, [selectedPropertyId, properties]);

  async function fetchProperties() {
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error('Failed to fetch properties');
      const data = await response.json();
      setProperties(data);
      if (data.length === 1) {
        setSelectedPropertyId((current) => current ?? data[0].id);
      }
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
      setExpandedBookingId(null);
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
      setExpandedBookingId(null);
    } catch (err) {
      setBookings([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    }
  }

  const handleRequestPropertyChange = (propertyId: number) => {
    const property = properties.find((candidate) => candidate.id === propertyId);
    setRangeAnchor(null);
    setRequestFormData((prev) => ({
      ...prev,
      propertyId,
      startDate: '',
      endDate: '',
      ownershipIds: property && property.ownerships.length ? [property.ownerships[0].id] : [],
    }));
    setVotingOwnershipId(property && property.ownerships.length ? property.ownerships[0].id : null);
  };

  async function handleVote(bookingId: number, choice: 'approve' | 'reject' | 'abstain') {
    if (!selectedFilterProperty) {
      setError('Select a property to cast votes');
      return;
    }

    if (!votingOwnershipId) {
      setError('Select which owner you are voting as');
      return;
    }

    setVotingSubmittingId(bookingId);
    setError(null);

    try {
      const response = await fetch('/api/booking-votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          ownershipId: votingOwnershipId,
          choice,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Failed to record vote');
        return;
      }

      await fetchBookings(selectedPropertyId ?? selectedFilterProperty.id);
    } catch (err) {
      console.error('vote error', err);
      setError('Unexpected error while recording vote');
    } finally {
      setVotingSubmittingId(null);
    }
  }

  const handleOwnershipToggle = (ownershipId: number, checked: boolean) => {
    setRequestFormData((prev) => {
      const ownershipIds = checked
        ? Array.from(new Set([...prev.ownershipIds, ownershipId]))
        : prev.ownershipIds.filter((id) => id !== ownershipId);
      return {
        ...prev,
        ownershipIds,
      };
    });
  };

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);

    if (!requestFormData.propertyId) {
      setRequestError('Select a property for the stay.');
      return;
    }

    if (!requestFormData.startDate || !requestFormData.endDate) {
      setRequestError('Select both start and end dates.');
      return;
    }

    if (requestFormData.ownershipIds.length === 0) {
      setRequestError('Select at least one owner to submit the request.');
      return;
    }

    const property = properties.find((candidate) => candidate.id === requestFormData.propertyId);
    if (!property) {
      setRequestError('Property not found.');
      return;
    }

    const ownerParticipants = requestFormData.ownershipIds
      .map((ownershipId) => {
        const ownership = property.ownerships.find((item) => item.id === ownershipId);
        if (!ownership) return null;
        const ownerProfile = ownership.ownerProfile;
        if (!ownerProfile) {
          return null;
        }
        const ownerName =
          [ownerProfile.firstName, ownerProfile.lastName].filter(Boolean).join(' ') || ownerProfile.email;
        return {
          role: 'OWNER' as const,
          ownershipId: ownership.id,
          displayName: ownerName,
          email: ownerProfile.email,
        };
      })
      .filter(Boolean);

    const participants: BookingParticipantInput[] = ownerParticipants as BookingParticipantInput[];

    if (requestFormData.guestName.trim()) {
      participants.push({
        role: 'GUEST',
        displayName: requestFormData.guestName.trim(),
        email: requestFormData.guestEmail.trim() || undefined,
      });
    }

    setRequestSubmitting(true);

    try {
      const payload = {
        propertyId: requestFormData.propertyId,
        createdByOwnershipId: requestFormData.ownershipIds[0],
        requestorOwnershipId: requestFormData.ownershipIds[0],
        startDate: requestFormData.startDate,
        endDate: requestFormData.endDate,
        guestName: requestFormData.guestName.trim() || undefined,
        guestEmail: requestFormData.guestEmail.trim() || undefined,
        notes: requestFormData.notes.trim() || undefined,
        participants,
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setRequestError(result?.error ?? 'Failed to create booking request.');
        return;
      }

      const createdBooking = result as Booking;

      if (selectedPropertyId) {
        await fetchBookings(selectedPropertyId);
      } else {
        await fetchAllBookings();
      }

      setExpandedBookingId(createdBooking.id);
      setShowRequestComposer(false);
      setRequestFormData((prev) => ({
        ...prev,
        startDate: '',
        endDate: '',
        guestName: '',
        guestEmail: '',
        notes: '',
      }));
      setRangeAnchor(null);
    } catch (err) {
      console.error('create booking request error', err);
      setRequestError('Unexpected error while creating booking request.');
    } finally {
      setRequestSubmitting(false);
    }
  }

  const selectedComposerProperty =
    properties.find((property) => property.id === requestFormData.propertyId) ?? null;

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
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Bookings Management</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">Bookings Management</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-slate-700 bg-slate-900/60 p-1 text-xs text-slate-300">
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-full px-3 py-1 transition ${viewMode === 'list' ? 'bg-emerald-500 text-black' : ''
                  }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`rounded-full px-3 py-1 transition ${viewMode === 'calendar' ? 'bg-emerald-500 text-black' : ''
                  }`}
              >
                Calendar
              </button>
            </div>
            <button
              onClick={() => {
                setRangeAnchor(null);
                setShowRequestComposer((prev) => !prev);
                setShowQuickForm(false);
              }}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-500"
            >
              {showRequestComposer ? 'Close Request Composer' : 'New Booking Request'}
            </button>
            <button
              onClick={() => {
                setRangeAnchor(null);
                setShowQuickForm((prev) => !prev);
                setShowRequestComposer(false);
              }}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {showQuickForm ? 'Hide Quick Create' : 'Quick Create'}
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
            <p className="font-semibold text-white">Pending requests</p>
            <p className="text-lg font-bold text-emerald-400">{pendingRequests.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
            <p className="font-semibold text-white">Upcoming bookings</p>
            <p className="text-lg font-bold text-emerald-400">{bookings.filter((b) => b.status === 'approved').length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
            <p className="font-semibold text-white">Blackouts</p>
            <p className="text-lg font-bold text-emerald-400">{availability?.items.filter((item) => item.type === 'blackout').length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Voting Panel */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Voting Dashboard</h2>
            <p className="text-sm text-slate-400">Review pending requests and cast your vote.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Vote as
              <select
                value={votingOwnershipId ?? ''}
                onChange={(event) => setVotingOwnershipId(event.target.value ? Number(event.target.value) : null)}
                className="ml-2 rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select owner</option>
                {selectedFilterProperty?.ownerships.map((ownership) => {
                  const ownerProfile = ownership.ownerProfile;
                  if (!ownerProfile) {
                    return null;
                  }
                  const ownerName =
                    [ownerProfile.firstName, ownerProfile.lastName].filter(Boolean).join(' ') || ownerProfile.email;
                  return (
                    <option key={ownership.id} value={ownership.id}>
                      {ownerName} · Power {ownership.votingPower}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </div>

        {!selectedFilterProperty ? (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            Select a property above to see pending requests and vote.
          </p>
        ) : pendingRequests.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            No pending requests for {selectedFilterProperty.name}.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingRequests.map((booking) => {
              const summary = getVotingSummary(booking, selectedFilterProperty);
              const approvalPercent = summary.total > 0 ? Math.min(100, Math.round((summary.approvals / summary.total) * 100)) : 0;
              const rejectionPercent = summary.total > 0 ? Math.min(100, Math.round((summary.rejections / summary.total) * 100)) : 0;

              return (
                <div key={booking.id} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Stay #{booking.id}</h3>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVote(booking.id, 'approve')}
                        disabled={votingSubmittingId === booking.id}
                        className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:bg-slate-600"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVote(booking.id, 'reject')}
                        disabled={votingSubmittingId === booking.id}
                        className="rounded-full bg-rose-500 px-4 py-1 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:bg-slate-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    <p>
                      Approvals {summary.approvals}/{summary.total} · Rejections {summary.rejections}/{summary.total} · Threshold {summary.threshold}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-emerald-500" style={{ width: `${approvalPercent}%` }} />
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-rose-500" style={{ width: `${rejectionPercent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <div className="bg-red-800 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="mb-6 space-y-4 mx-auto w-full max-w-6xl">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">Viewing month</p>
              <p className="text-lg font-semibold text-white">
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-emerald-400 hover:text-white"
              >
                ←
              </button>
              <button
                onClick={goToNextMonth}
                className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-emerald-400 hover:text-white"
              >
                →
              </button>
              {availabilityLoading ? (
                <span className="text-xs text-slate-400">Refreshing…</span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Available</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Booked</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Blackout</span>
            </div>
          </div>

          {availabilityError ? (
            <div className="rounded border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {availabilityError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <div className="grid grid-cols-7 bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
              {weekdays.map((weekday) => (
                <div key={weekday} className="px-3 py-2 text-center">{weekday}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((cell) => {
                const hasItems = cell.items.length > 0;
                const isInteractive = cell.available || cell.items.some((item) => item.type === 'booking');
                const startIso = requestFormData.startDate || null;
                const endIso = requestFormData.endDate || null;
                const hasRange = Boolean(startIso && endIso);
                const isInRange =
                  hasRange && startIso && endIso ? cell.iso >= startIso && cell.iso <= endIso : false;
                const isRangeEndpoint = isInRange && (cell.iso === startIso || cell.iso === endIso);
                const cellClasses = [
                  'min-h-[5.5rem] border border-slate-800 p-2 text-xs transition',
                  cell.inCurrentMonth ? 'bg-slate-950/60 text-slate-200' : 'bg-slate-950/20 text-slate-500',
                  !cell.available ? 'ring-1 ring-rose-400/50' : '',
                  cell.isToday ? 'ring-2 ring-emerald-400' : '',
                  isInteractive ? 'hover:bg-slate-900/70 cursor-pointer' : 'cursor-default',
                  isInRange ? 'bg-emerald-500/15 text-emerald-100' : '',
                  isRangeEndpoint ? 'ring-2 ring-emerald-300 text-emerald-50' : '',
                ].join(' ');

                return (
                  <div
                    key={cell.iso}
                    className={`${cellClasses} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
                    onClick={() => handleCalendarCellClick(cell)}
                    role="button"
                    tabIndex={isInteractive ? 0 : -1}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleCalendarCellClick(cell);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between text-white">
                      <span className="text-sm font-semibold">{cell.date.getDate()}</span>
                      <div className="flex items-center gap-1">
                        {isRangeEndpoint ? (
                          <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
                            {cell.iso === startIso ? 'Start' : 'End'}
                          </span>
                        ) : null}
                        {!cell.available ? (
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose-200">
                            Hold
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {cell.items.slice(0, 2).map((item) => {
                        const isBooking = item.type === 'booking';
                        const visualClasses = isBooking
                          ? item.status === 'pending'
                            ? 'bg-amber-500/30 hover:bg-amber-500/40 focus-visible:bg-amber-500/40'
                            : 'bg-emerald-500/30 hover:bg-emerald-500/40 focus-visible:bg-emerald-500/40'
                          : 'bg-slate-500/20 hover:bg-slate-500/30 focus-visible:bg-slate-500/30';
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCalendarItemClick(item);
                            }}
                            disabled={!isBooking}
                            className={`w-full rounded-lg px-2 py-1 text-left text-[11px] text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-default disabled:opacity-70 ${visualClasses}`}
                            title={item.title}
                          >
                            <p className="font-medium">{item.title}</p>
                            {item.subtitle ? <p className="text-[10px] text-slate-200">{item.subtitle}</p> : null}
                          </button>
                        );
                      })}
                      {cell.items.length > 2 ? (
                        <p className="text-[10px] text-slate-400">+{cell.items.length - 2} more</p>
                      ) : null}
                      {!hasItems && !cell.available ? (
                        <p className="text-[10px] text-rose-200">Unavailable</p>
                      ) : null}
                      {!hasItems && cell.available ? (
                        <p className="text-[10px] text-slate-500">Available</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* Booking Request Composer */}
      {showRequestComposer && (
        <div className="rounded-lg bg-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">New Booking Request</h2>
          {requestError ? (
            <div className="mb-4 rounded border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {requestError}
            </div>
          ) : null}
          <form onSubmit={handleCreateRequest} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300 md:col-span-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Property</span>
              <select
                value={requestFormData.propertyId || ''}
                onChange={(event) => handleRequestPropertyChange(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2 md:col-span-1">
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Start date</span>
                <input
                  type="date"
                  value={requestFormData.startDate}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">End date</span>
                <input
                  type="date"
                  value={requestFormData.endDate}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </label>
            </div>

            <div className="md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Include owners</span>
              {selectedComposerProperty && selectedComposerProperty.ownerships.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  {selectedComposerProperty.ownerships.map((ownership) => {
                    const ownerProfile = ownership.ownerProfile;
                    if (!ownerProfile) {
                      return null;
                    }
                    const ownerName =
                      [ownerProfile.firstName, ownerProfile.lastName].filter(Boolean).join(' ') ||
                      ownerProfile.email;
                    const checked = requestFormData.ownershipIds.includes(ownership.id);

                    return (
                      <label key={ownership.id} className="flex items-center gap-3 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => handleOwnershipToggle(ownership.id, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                        />
                        <span className="flex-1">
                          <span className="font-medium text-white">{ownerName}</span>
                          <span className="ml-2 text-xs text-slate-500">{ownerProfile.email}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                  No owners available for this property yet.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Guest name</span>
                <input
                  type="text"
                  value={requestFormData.guestName}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, guestName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Optional guest"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Guest email</span>
                <input
                  type="email"
                  value={requestFormData.guestEmail}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, guestEmail: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="guest@example.com"
                />
              </label>
            </div>

            <label className="md:col-span-2 text-sm text-slate-300">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Notes for co-owners</span>
              <textarea
                value={requestFormData.notes}
                onChange={(event) =>
                  setRequestFormData((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                placeholder="Add any context or priorities for this request"
              />
            </label>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={requestSubmitting}
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:bg-slate-600"
              >
                {requestSubmitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRangeAnchor(null);
                  setShowRequestComposer(false);
                }}
                className="rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
              onClick={() => {
                setRangeAnchor(null);
                setShowQuickForm(false);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
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
                    const isExpanded = expandedBookingId === booking.id;
                    const stayNights = Math.ceil(
                      (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
                      (1000 * 60 * 60 * 24),
                    );
                    const primaryParticipant = booking.participants.find((participant) => participant.role !== 'OWNER');
                    const displayGuestName = booking.guestName ?? primaryParticipant?.displayName ?? '—';
                    const displayGuestEmail = booking.guestEmail ?? primaryParticipant?.email ?? '—';

                    return (
                      <Fragment key={booking.id}>
                        <tr className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {propertyDetails?.name ?? 'Unknown property'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">{displayGuestName}</div>
                            <div className="text-sm text-gray-400">{displayGuestEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-400">{stayNights} nights</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {booking.totalFormatted ?? `$${(booking.totalAmount / 100).toFixed(2)}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                              className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-xs"
                            >
                              {isExpanded ? 'Hide details' : 'Details'}
                            </button>
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
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-slate-900/60 px-6 py-5">
                              <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                                  <header className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Participants</h3>
                                    <span className="text-xs text-slate-500">{booking.participants.length} total</span>
                                  </header>
                                  {booking.participants.length === 0 ? (
                                    <p className="text-sm text-slate-400">No participants recorded.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {booking.participants.map((participant) => {
                                        const ownershipOwner = participant.ownership?.ownerProfile;
                                        const roleLabel = roleLabels[participant.role] ?? participant.role;
                                        const ownerName = ownershipOwner
                                          ? [ownershipOwner.firstName, ownershipOwner.lastName].filter(Boolean).join(' ') || ownershipOwner.email
                                          : null;

                                        return (
                                          <div
                                            key={participant.id}
                                            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div>
                                                <p className="text-sm font-medium text-white">{participant.displayName}</p>
                                                {participant.email ? (
                                                  <p className="text-xs text-slate-400">{participant.email}</p>
                                                ) : null}
                                              </div>
                                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                                {roleLabel}
                                              </span>
                                            </div>
                                            <div className="mt-2 flex justify-between text-xs text-slate-500">
                                              <span>{participant.nights} nights</span>
                                              {ownerName ? <span>Owner: {ownerName}</span> : null}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <div className="grid gap-2 text-xs text-slate-400">
                                    <div className="flex justify-between">
                                      <span>Submitted</span>
                                      <span>{formatDateTime(booking.submittedAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Decision</span>
                                      <span>{formatDateTime(booking.decisionAt)}</span>
                                    </div>
                                  </div>

                                  {booking.requestNotes ? (
                                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Request notes</p>
                                      <p className="mt-1 text-sm leading-relaxed">{booking.requestNotes}</p>
                                    </div>
                                  ) : null}

                                  {booking.decisionSummary ? (
                                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Decision</p>
                                      <p className="mt-1 text-sm leading-relaxed">{booking.decisionSummary}</p>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Timeline</h3>
                                  {booking.timeline.length === 0 ? (
                                    <p className="text-sm text-slate-400">No timeline events recorded.</p>
                                  ) : (
                                    <ol className="space-y-3 text-sm text-slate-200">
                                      {booking.timeline.map((event) => {
                                        const actorUser = event.actor.user;
                                        const actorOwnership = event.actor.ownership;
                                        const actorOwner = actorOwnership?.ownerProfile;
                                        const actorName =
                                          (actorUser
                                            ? [actorUser.firstName, actorUser.lastName].filter(Boolean).join(' ') || actorUser.email
                                            : null) ??
                                          (actorOwner
                                            ? [actorOwner.firstName, actorOwner.lastName].filter(Boolean).join(' ') || actorOwner.email
                                            : null);

                                        return (
                                          <li key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                                            <div className="flex items-start justify-between text-xs uppercase tracking-wide text-slate-400">
                                              <span>{eventLabels[event.type] ?? event.type}</span>
                                              <span>{new Date(event.createdAt).toLocaleString()}</span>
                                            </div>
                                            {event.message ? (
                                              <p className="mt-2 text-sm text-slate-200 leading-relaxed">{event.message}</p>
                                            ) : null}
                                            {actorName ? (
                                              <p className="mt-1 text-xs text-slate-500">By {actorName}</p>
                                            ) : null}
                                          </li>
                                        );
                                      })}
                                    </ol>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
