
'use client';

import { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ResponsiveTable, type ResponsiveColumn, type RowAction } from '@/components/datagrid/ResponsiveTable';
import type { BookingParticipantInput } from '@/lib/validation';
import { confirmBooking, cancelBooking, deleteBooking, createQuickBooking, createQuickBlackout } from './actions';
interface PropertyOwnership {
  id: number;
  role: string;
  shareBps: number;
  votingPower: number;
  owner: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
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
  owner: BookingUser | null;
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
    owner: BookingUser | null;
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
        const ownerName =
          [ownership.owner.firstName, ownership.owner.lastName].filter(Boolean).join(' ') || ownership.owner.email;
        return {
          role: 'OWNER' as const,
          ownershipId: ownership.id,
          displayName: ownerName,
          email: ownership.owner.email,
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

  const expandedBooking = useMemo(
    () => (expandedBookingId ? bookings.find((booking) => booking.id === expandedBookingId) ?? null : null),
    [bookings, expandedBookingId],
  );

  const resolveProperty = useCallback(
    (booking: Booking) => booking.property ?? properties.find((property) => property.id === booking.propertyId) ?? null,
    [properties],
  );

  const statusClassByState = useMemo(
    () => ({
      approved: 'text-success bg-success/10',
      pending: 'text-warning bg-warning/10',
      rejected: 'text-destructive bg-destructive/10',
      cancelled: 'text-muted-foreground bg-background-muted',
    }),
    [],
  );

  const bookingColumns = useMemo<ResponsiveColumn<Booking>[]>(
    () => [
      {
        id: 'property',
        header: 'Property',
        priority: 'high',
        mobileLabel: 'Property',
        renderCell: (booking) => {
          const property = resolveProperty(booking);
          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">{property?.name ?? 'Unknown property'}</span>
              {property?.location ? (
                <span className="text-xs text-muted-foreground">{property.location}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'guest',
        header: 'Guest',
        priority: 'high',
        mobileLabel: 'Guest',
        renderCell: (booking) => {
          const primaryParticipant = booking.participants.find((participant) => participant.role !== 'OWNER');
          const displayGuestName = booking.guestName ?? primaryParticipant?.displayName ?? '—';
          const displayGuestEmail = booking.guestEmail ?? primaryParticipant?.email ?? '—';

          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-foreground">{displayGuestName}</span>
              <span className="text-xs text-muted-foreground">{displayGuestEmail}</span>
            </div>
          );
        },
      },
      {
        id: 'dates',
        header: 'Dates',
        priority: 'medium',
        mobileLabel: 'Dates',
        renderCell: (booking) => {
          const start = new Date(booking.startDate);
          const end = new Date(booking.endDate);
          const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-foreground">
                {start.toLocaleDateString()} – {end.toLocaleDateString()}
              </span>
              <span className="text-xs text-muted-foreground">{nights} nights</span>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        priority: 'low',
        align: 'center',
        mobileLabel: 'Status',
        minWidthClassName: 'min-w-[8rem]',
        renderCell: (booking) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
              statusClassByState[booking.status as keyof typeof statusClassByState] ?? 'text-muted-foreground bg-background-muted'
            }`}
          >
            {booking.status}
          </span>
        ),
      },
      {
        id: 'total',
        header: 'Total',
        align: 'end',
        priority: 'medium',
        mobileLabel: 'Total',
        minWidthClassName: 'min-w-[8rem]',
        headerClassName: 'pr-16',
        cellClassName: 'pr-16',
        renderCell: (booking) => (
          <span className="text-sm font-semibold text-foreground">
            {booking.totalFormatted ?? `$${(booking.totalAmount / 100).toFixed(2)}`}
          </span>
        ),
      },
    ],
    [resolveProperty, statusClassByState],
  );

  const bookingRowActions = (booking: Booking): RowAction<Booking>[] => {
    const actionList: RowAction<Booking>[] = [
      {
        id: 'details',
        label: expandedBookingId === booking.id ? 'Hide details' : 'View details',
        onSelect: () => setExpandedBookingId((prev) => (prev === booking.id ? null : booking.id)),
      },
    ];

    if (booking.status === 'pending') {
      actionList.push({
        id: 'confirm',
        label: 'Confirm',
        onSelect: () => {
          void handleConfirm(booking.id);
        },
      });
    }

    if (booking.status !== 'cancelled') {
      actionList.push({
        id: 'cancel',
        label: 'Cancel',
        onSelect: () => {
          void handleCancel(booking.id);
        },
      });
    }

    actionList.push({
      id: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => {
        void handleDelete(booking.id);
      },
    });

    return actionList;
  };

  if (loading) {
    return (
      <Container padding="md" className="space-y-6">
        <PageHeader title="Bookings management" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Container>
    );
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-default bg-background-muted p-1 text-xs text-muted-foreground">
        <button
          onClick={() => setViewMode('list')}
          className={`rounded-full px-3 py-1 transition ${viewMode === 'list' ? 'bg-emerald-500 text-black' : ''}`}
        >
          List
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`rounded-full px-3 py-1 transition ${viewMode === 'calendar' ? 'bg-emerald-500 text-black' : ''}`}
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
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-blue-500"
      >
        {showQuickForm ? 'Hide Quick Create' : 'Quick Create'}
      </button>
    </div>
  );


  return (
    <Container padding="md" className="space-y-10">
      <PageHeader
        title="Bookings management"
        description="Review requests, manage availability, and coordinate with owners."
        primaryAction={headerActions}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-default bg-background-muted px-4 py-3 text-xs text-muted-foreground shadow-soft">
          <p className="font-semibold text-foreground">Pending requests</p>
          <p className="text-lg font-bold text-accent">{pendingRequests.length}</p>
        </div>
        <div className="rounded-2xl border border-default bg-background-muted px-4 py-3 text-xs text-muted-foreground shadow-soft">
          <p className="font-semibold text-foreground">Upcoming bookings</p>
          <p className="text-lg font-bold text-accent">{bookings.filter((b) => b.status === 'approved').length}</p>
        </div>
        <div className="rounded-2xl border border-default bg-background-muted px-4 py-3 text-xs text-muted-foreground shadow-soft">
          <p className="font-semibold text-foreground">Blackouts</p>
          <p className="text-lg font-bold text-accent">
            {availability?.items.filter((item) => item.type === 'blackout').length ?? 0}
          </p>
        </div>
      </div>

      {/* Voting Panel */}
      <div className="rounded-3xl border border-default bg-surface px-6 py-6 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Voting dashboard</h2>
            <p className="text-sm text-muted-foreground">Review pending requests and cast your vote.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vote as
              <select
                value={votingOwnershipId ?? ''}
                onChange={(event) => setVotingOwnershipId(event.target.value ? Number(event.target.value) : null)}
                className="ml-2 rounded-lg border border-default bg-background px-3 py-2 text-sm text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Select owner</option>
                {selectedFilterProperty?.ownerships.map((ownership) => {
                  const ownerName =
                    [ownership.owner.firstName, ownership.owner.lastName].filter(Boolean).join(' ') ||
                    ownership.owner.email;
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
          <p className="mt-4 rounded-xl border border-default bg-background-muted px-4 py-3 text-sm text-muted-foreground shadow-soft">
            Select a property above to see pending requests and vote.
          </p>
        ) : pendingRequests.length === 0 ? (
          <p className="mt-4 rounded-xl border border-default bg-background-muted px-4 py-3 text-sm text-muted-foreground shadow-soft">
            No pending requests for {selectedFilterProperty.name}.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingRequests.map((booking) => {
              const summary = getVotingSummary(booking, selectedFilterProperty);
              const approvalPercent = summary.total > 0 ? Math.min(100, Math.round((summary.approvals / summary.total) * 100)) : 0;
              const rejectionPercent = summary.total > 0 ? Math.min(100, Math.round((summary.rejections / summary.total) * 100)) : 0;

              return (
                <div key={booking.id} className="rounded-2xl border border-default bg-background px-4 py-4 shadow-soft">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Stay #{booking.id}</h3>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVote(booking.id, 'approve')}
                        disabled={votingSubmittingId === booking.id}
                        className="rounded-full bg-accent px-4 py-1 text-xs font-semibold text-background transition hover:bg-accent/90 disabled:bg-muted-foreground/30"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVote(booking.id, 'reject')}
                        disabled={votingSubmittingId === booking.id}
                        className="rounded-full bg-destructive px-4 py-1 text-xs font-semibold text-background transition hover:bg-destructive/90 disabled:bg-muted-foreground/30"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>
                      Approvals {summary.approvals}/{summary.total} · Rejections {summary.rejections}/{summary.total} · Threshold {summary.threshold}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${approvalPercent}%` }} />
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-background-muted">
                      <div className="h-full rounded-full bg-destructive" style={{ width: `${rejectionPercent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-default bg-surface px-4 py-4 shadow-soft md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Viewing month</p>
              <p className="text-lg font-semibold text-foreground">
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="rounded-full border border-default px-3 py-1 text-sm text-foreground transition hover:border-accent"
              >
                ←
              </button>
              <button
                onClick={goToNextMonth}
                className="rounded-full border border-default px-3 py-1 text-sm text-foreground transition hover:border-accent"
              >
                →
              </button>
              {availabilityLoading ? (
                <span className="text-xs text-muted-foreground">Refreshing…</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Available</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500/80" /> Approved booking</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400/80" /> Pending request</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500/80" /> Blackout</span>
            </div>
          </div>

          {availabilityError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {availabilityError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-default">
            <div className="grid grid-cols-7 bg-background-muted text-xs uppercase tracking-wide text-muted-foreground">
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
                  'min-h-[5.5rem] border border-default bg-background p-2 text-xs transition',
                  cell.inCurrentMonth ? 'text-foreground' : 'bg-background-muted text-muted-foreground',
                  !cell.available ? 'ring-1 ring-rose-500/60' : '',
                  cell.isToday ? 'ring-2 ring-accent' : '',
                  isInteractive ? 'hover:bg-background-muted cursor-pointer' : 'cursor-default',
                  isInRange ? 'bg-accent/20 text-accent' : '',
                  isRangeEndpoint ? 'ring-2 ring-accent text-accent font-semibold' : '',
                ].join(' ');

                return (
                  <div
                    key={cell.iso}
                    className={`${cellClasses} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
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
                    <div className="flex items-center justify-between text-foreground">
                      <span className="text-sm font-semibold">{cell.date.getDate()}</span>
                      <div className="flex items-center gap-1">
                        {isRangeEndpoint ? (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                            {cell.iso === startIso ? 'Start' : 'End'}
                          </span>
                        ) : null}
                        {!cell.available ? (
                          <span className="rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose-100">
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
                            ? 'bg-amber-400/30 text-slate-950 hover:bg-amber-400/40 focus-visible:bg-amber-400/40'
                            : 'bg-emerald-500/30 text-slate-950 hover:bg-emerald-500/40 focus-visible:bg-emerald-500/40'
                          : 'bg-slate-500/20 text-foreground hover:bg-slate-500/30 focus-visible:bg-slate-500/30';
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCalendarItemClick(item);
                            }}
                            disabled={!isBooking}
                            className={`w-full rounded-lg px-2 py-1 text-left text-[11px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-70 ${visualClasses}`}
                            title={item.title}
                          >
                            <p className="font-medium">{item.title}</p>
                            {item.subtitle ? <p className="text-[10px] text-muted-foreground">{item.subtitle}</p> : null}
                          </button>
                        );
                      })}
                      {cell.items.length > 2 ? (
                        <p className="text-[10px] text-muted-foreground">+{cell.items.length - 2} more</p>
                      ) : null}
                      {!hasItems && !cell.available ? (
                        <p className="text-[10px] text-destructive">Unavailable</p>
                      ) : null}
                      {!hasItems && cell.available ? (
                        <p className="text-[10px] text-muted-foreground">Available</p>
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
      <div className="rounded-3xl border border-default bg-surface px-6 py-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Filter by property</h2>
            <p className="text-sm text-muted-foreground">Narrow results to a single home or review everything.</p>
          </div>
        </div>
        <div className="mt-4 max-w-md">
          <Select
            value={selectedPropertyId ?? ''}
            onChange={(event) => setSelectedPropertyId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
                {property.location ? ` · ${property.location}` : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Booking Request Composer */}
      {showRequestComposer && (
        <div className="rounded-3xl border border-default bg-surface px-6 py-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">New booking request</h2>
          <p className="text-sm text-muted-foreground">Draft a new stay and include the owners who should review it.</p>
          {requestError ? (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {requestError}
            </div>
          ) : null}
          <form onSubmit={handleCreateRequest} className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</label>
              <Select
                value={requestFormData.propertyId || ''}
                onChange={(event) => handleRequestPropertyChange(Number(event.target.value))}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</label>
                <Input
                  type="date"
                  value={requestFormData.startDate}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End date</label>
                <Input
                  type="date"
                  value={requestFormData.endDate}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Include owners</span>
              {selectedComposerProperty && selectedComposerProperty.ownerships.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-default bg-background px-4 py-4 shadow-soft">
                  {selectedComposerProperty.ownerships.map((ownership) => {
                    const ownerName =
                      [ownership.owner.firstName, ownership.owner.lastName].filter(Boolean).join(' ') ||
                      ownership.owner.email;
                    const checked = requestFormData.ownershipIds.includes(ownership.id);

                    return (
                      <label key={ownership.id} className="flex items-center gap-3 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => handleOwnershipToggle(ownership.id, event.target.checked)}
                          className="h-4 w-4 rounded border border-default bg-background text-accent focus:ring-accent"
                        />
                        <span className="flex-1">
                          <span className="font-medium text-foreground">{ownerName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{ownership.owner.email}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-default bg-background-muted px-4 py-3 text-sm text-muted-foreground shadow-soft">
                  No owners available for this property yet.
                </p>
              )}
            </div>

            <div className="grid gap-5 md:col-span-2 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest name</label>
                <Input
                  type="text"
                  value={requestFormData.guestName}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, guestName: event.target.value }))
                  }
                  placeholder="Optional guest"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest email</label>
                <Input
                  type="email"
                  value={requestFormData.guestEmail}
                  onChange={(event) =>
                    setRequestFormData((prev) => ({ ...prev, guestEmail: event.target.value }))
                  }
                  placeholder="guest@example.com"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes for co-owners</label>
              <Textarea
                value={requestFormData.notes}
                onChange={(event) =>
                  setRequestFormData((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
                placeholder="Add any context or priorities for this request"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={requestSubmitting}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:bg-muted-foreground/30"
              >
                {requestSubmitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRangeAnchor(null);
                  setShowRequestComposer(false);
                }}
                className="rounded-full border border-default px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-background-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Create Form */}
      {showQuickForm && (
        <div className="rounded-3xl border border-default bg-surface px-6 py-6 shadow-soft space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Quick create</h2>
              <p className="text-sm text-muted-foreground">Block time or add a manual booking without leaving this page.</p>
            </div>
          </div>

          {!selectedPropertyId && (
            <p className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning shadow-soft">
              Select a property before creating a booking or blackout.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label>
              <Select
                value={quickFormData.type}
                onChange={(event) => setQuickFormData((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="booking">Manual booking</option>
                <option value="blackout">Blackout period</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={quickFormData.startDate}
                onChange={(event) => setQuickFormData((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End date</label>
              <Input
                type="date"
                value={quickFormData.endDate}
                onChange={(event) => setQuickFormData((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </div>

            {quickFormData.type === 'booking' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest name</label>
                <Input
                  type="text"
                  value={quickFormData.guestName}
                  onChange={(event) => setQuickFormData((prev) => ({ ...prev, guestName: event.target.value }))}
                  placeholder="Owner/Manual block"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</label>
                <Input
                  type="text"
                  value={quickFormData.reason}
                  onChange={(event) => setQuickFormData((prev) => ({ ...prev, reason: event.target.value }))}
                  placeholder="Manual block"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleQuickCreate}
              disabled={!selectedPropertyId}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:bg-muted-foreground/30"
            >
              Create {quickFormData.type === 'booking' ? 'booking' : 'blackout'}
            </button>
            <button
              onClick={() => {
                setRangeAnchor(null);
                setShowQuickForm(false);
              }}
              className="rounded-full border border-default px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-background-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <ResponsiveTable
            columns={bookingColumns}
            rows={bookings}
            rowKey={(booking) => booking.id.toString()}
            emptyState="No bookings found"
            mobileTitleColumnId="property"
            actions={bookingRowActions}
          />

          {expandedBooking ? (
            <section className="rounded-3xl border border-default bg-surface px-6 py-6 shadow-soft">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-default bg-background p-4">
                  <header className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Participants</h3>
                    <span className="text-xs text-muted-foreground">{expandedBooking.participants.length} total</span>
                  </header>
                  {expandedBooking.participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No participants recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {expandedBooking.participants.map((participant) => {
                        const ownershipOwner = participant.ownership?.owner;
                        const roleLabel = roleLabels[participant.role] ?? participant.role;
                        const ownerName =
                          ownershipOwner
                            ? [ownershipOwner.firstName, ownershipOwner.lastName].filter(Boolean).join(' ') || ownershipOwner.email
                            : null;

                        return (
                          <div
                            key={participant.id}
                            className="rounded-xl border border-default bg-background-muted p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">{participant.displayName}</p>
                                {participant.email ? (
                                  <p className="text-xs text-muted-foreground">{participant.email}</p>
                                ) : null}
                              </div>
                              <span className="rounded-full bg-background-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {roleLabel}
                              </span>
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                              <span>{participant.nights} nights</span>
                              {ownerName ? <span>Owner: {ownerName}</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Submitted</span>
                      <span>{formatDateTime(expandedBooking.submittedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Decision</span>
                      <span>{formatDateTime(expandedBooking.decisionAt)}</span>
                    </div>
                  </div>

                  {expandedBooking.requestNotes ? (
                    <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Request notes</p>
                      <p className="mt-1 text-sm leading-relaxed">{expandedBooking.requestNotes}</p>
                    </div>
                  ) : null}

                  {expandedBooking.decisionSummary ? (
                    <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                      <p className="text-xs font-semibold uppercase tracking-wide text-success">Decision</p>
                      <p className="mt-1 text-sm leading-relaxed">{expandedBooking.decisionSummary}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-default bg-background p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h3>
                  {expandedBooking.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline events recorded.</p>
                  ) : (
                    <ol className="space-y-3 text-sm text-foreground">
                      {expandedBooking.timeline.map((event) => {
                        const actorUser = event.actor.user;
                        const actorOwnership = event.actor.ownership;
                        const actorOwner = actorOwnership?.owner;
                        const actorName =
                          (actorUser
                            ? [actorUser.firstName, actorUser.lastName].filter(Boolean).join(' ') || actorUser.email
                            : null) ??
                          (actorOwner
                            ? [actorOwner.firstName, actorOwner.lastName].filter(Boolean).join(' ') || actorOwner.email
                            : null);

                        return (
                          <li key={event.id} className="rounded-xl border border-default bg-background-muted p-3">
                            <div className="flex items-start justify-between text-xs uppercase tracking-wide text-muted-foreground">
                              <span>{eventLabels[event.type] ?? event.type}</span>
                              <span>{new Date(event.createdAt).toLocaleString()}</span>
                            </div>
                            {event.message ? (
                              <p className="mt-2 text-sm text-foreground leading-relaxed">{event.message}</p>
                            ) : null}
                            {actorName ? (
                              <p className="mt-1 text-xs text-muted-foreground">By {actorName}</p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </Container>
  );
}
