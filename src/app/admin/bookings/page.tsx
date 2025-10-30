'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import {
  AdminPage,
  AdminSection,
  AdminMetric,
  AdminMetricGrid,
  AdminCard,
  AdminSplit,
} from '@/components/ui/AdminPage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/cn';
import type { BookingParticipantInput } from '@/lib/validation';
import { confirmBooking, cancelBooking, deleteBooking } from './actions';
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

interface BookingSectionConfig {
  id: string;
  title: string;
  description: string;
  bookings: Booking[];
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
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
  const [showRequestComposer, setShowRequestComposer] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    propertyId: 0,
    startDate: '',
    endDate: '',
    ownershipIds: [] as number[],
    guestName: '',
    guestEmail: '',
    notes: '',
  });
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [votingOwnershipId, setVotingOwnershipId] = useState<number | null>(null);
  const [votingSubmittingId, setVotingSubmittingId] = useState<number | null>(null);
  const expandedBooking = useMemo(
    () => (expandedBookingId ? bookings.find((booking) => booking.id === expandedBookingId) ?? null : null),
    [bookings, expandedBookingId],
  );
  const selectedFilterProperty = selectedPropertyId
    ? properties.find((property) => property.id === selectedPropertyId) ?? null
    : null;
  const selectedComposerProperty = useMemo(
    () => properties.find((property) => property.id === requestFormData.propertyId) ?? null,
    [properties, requestFormData.propertyId],
  );
  const pendingRequests = bookings.filter((booking) => booking.status === 'pending');
  const upcomingApprovedBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const isApproved = booking.status === 'approved';
        if (!isApproved) return false;
        const start = new Date(booking.startDate);
        // limit to future or same-day bookings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return start >= today;
      }),
    [bookings],
  );
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

      setViewMode('list');
      setExpandedBookingId(matchingBooking.id);
    },
    [bookings, selectedPropertyId, setSelectedPropertyId, setExpandedBookingId, setViewMode],
  );

  const handleRequestPropertyChange = useCallback(
    (propertyId: number) => {
      const property = properties.find((candidate) => candidate.id === propertyId) ?? null;
      setRequestFormData((prev) => ({
        ...prev,
        propertyId,
        ownershipIds: property && property.ownerships.length ? [property.ownerships[0].id] : [],
      }));
    },
    [properties],
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
      const targetPropertyId =
        selectedPropertyId ??
        (requestFormData.propertyId > 0 ? requestFormData.propertyId : undefined) ??
        properties[0]?.id ??
        0;
      if (!targetPropertyId) {
        return;
      }

      handleRequestPropertyChange(targetPropertyId);

      if (!rangeAnchor) {
        setRequestFormData((prev) => ({
          ...prev,
          propertyId: targetPropertyId,
          startDate: isoDate,
          endDate: '',
        }));
        setRangeAnchor(isoDate);
        setShowRequestComposer(false);
        return;
      }

      const [start, end] = rangeAnchor <= isoDate ? [rangeAnchor, isoDate] : [isoDate, rangeAnchor];
      setRequestFormData((prev) => ({
        ...prev,
        propertyId: targetPropertyId,
        startDate: start,
        endDate: end,
      }));
      setRangeAnchor(null);
      setExpandedBookingId(null);
      setShowRequestComposer(true);
    },
    [
      handleCalendarItemClick,
      handleRequestPropertyChange,
      properties,
      rangeAnchor,
      requestFormData.propertyId,
      selectedPropertyId,
    ],
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
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error('Failed to fetch properties');
      const data: Property[] = await response.json();
      setProperties(data);
      if (data.length > 0) {
        setSelectedPropertyId((current) => {
          if (current && data.some((property: Property) => property.id === current)) {
            return current;
          }
          return data[0].id;
        });
        setRequestFormData((prev) => {
          if (prev.propertyId && data.some((property) => property.id === prev.propertyId)) {
            return prev;
          }
          const firstProperty = data[0];
          return {
            ...prev,
            propertyId: firstProperty.id,
            ownershipIds: firstProperty.ownerships.length ? [firstProperty.ownerships[0].id] : [],
          };
        });
      } else {
        setSelectedPropertyId(null);
        setRequestFormData((prev) => ({
          ...prev,
          propertyId: 0,
          ownershipIds: [],
        }));
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
        } satisfies BookingParticipantInput;
      })
      .filter(Boolean) as BookingParticipantInput[];

    const participants: BookingParticipantInput[] = [...ownerParticipants];

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

  const isLoading = loading;

  const renderBookingSection = ({ id, title, description, bookings }: BookingSectionConfig) => {
    return (
      <AdminSection title={title} description={description}>
        <div id={id} className="space-y-4 md:table md:w-full md:border-separate md:[border-spacing:0_0.75rem]">
          <div className="hidden md:table-row text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="md:table-cell md:px-4 md:py-2 md:first:pl-0">Property</span>
            <span className="md:table-cell md:px-4 md:py-2">Guest</span>
            <span className="md:table-cell md:px-4 md:py-2">Dates</span>
            <span className="md:table-cell md:px-4 md:py-2 text-right">Total</span>
            <span className="md:table-cell md:px-4 md:py-2 text-center">Status</span>
            <span className="md:table-cell md:px-4 md:py-2 text-right">Actions</span>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-default bg-background px-4 py-6 text-sm text-muted-foreground shadow-soft">
              No bookings found
            </div>
          ) : null}

          {bookings.map((booking) => {
            const property = resolveProperty(booking);
            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);
            const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            const primaryParticipant = booking.participants.find((participant) => participant.role !== 'OWNER');
            const displayGuestName = booking.guestName ?? primaryParticipant?.displayName ?? '—';
            const displayGuestEmail = booking.guestEmail ?? primaryParticipant?.email ?? '—';

            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-default bg-background px-4 py-5 shadow-soft transition md:table-row md:rounded-xl md:border md:border-border md:bg-background md:px-0 md:py-0 md:shadow-none"
              >
                <div className="flex flex-col gap-1 md:table-cell md:align-middle md:px-4 md:py-4 md:first:pl-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                    Property
                  </span>
                  <div className="mt-1 flex flex-col gap-1 md:mt-0">
                    <span className="text-sm font-semibold text-foreground">{property?.name ?? 'Unknown property'}</span>
                    {property?.location ? (
                      <span className="text-xs text-muted-foreground">{property.location}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:table-cell md:align-middle md:px-4 md:py-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Guest</span>
                  <div className="mt-1 flex flex-col gap-1 md:mt-0">
                    <span className="text-sm text-foreground">{displayGuestName}</span>
                    <span className="text-xs text-muted-foreground">{displayGuestEmail}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:table-cell md:align-middle md:px-4 md:py-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Dates</span>
                  <div className="mt-1 flex flex-col gap-1 md:mt-0">
                    <span className="text-sm text-foreground">
                      {start.toLocaleDateString()} – {end.toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground">{nights} nights</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:table-cell md:align-middle md:px-4 md:py-4 md:text-right">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Total</span>
                  <span className="mt-1 text-sm font-semibold text-foreground md:mt-0">
                    {booking.totalFormatted ?? `$${(booking.totalAmount / 100).toFixed(2)}`}
                  </span>
                </div>

                <div className="mt-2 md:mt-0 md:table-cell md:align-middle md:px-4 md:py-4 md:text-center">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Status</span>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold md:mt-0',
                      statusClassByState[booking.status as keyof typeof statusClassByState] ??
                        'text-muted-foreground bg-background-muted',
                    )}
                  >
                    {booking.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:table-cell md:align-middle md:px-4 md:py-4 md:text-right">
                  <span className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                    Actions
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedBookingId((prev) => (prev === booking.id ? null : booking.id))}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:ml-auto"
                  >
                    {expandedBookingId === booking.id ? 'Hide details' : 'View details'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </AdminSection>
    );
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-default bg-background-muted p-1 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={cn(
            'rounded-full px-3 py-1 transition',
            viewMode === 'list' ? 'bg-emerald-500 text-black shadow-soft' : 'hover:bg-background'
          )}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={cn(
            'rounded-full px-3 py-1 transition',
            viewMode === 'calendar' ? 'bg-emerald-500 text-black shadow-soft' : 'hover:bg-background'
          )}
        >
          Calendar
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          const fallbackPropertyId =
            (requestFormData.propertyId && requestFormData.propertyId > 0
              ? requestFormData.propertyId
              : undefined) ??
            selectedPropertyId ??
            properties[0]?.id ??
            0;
          if (fallbackPropertyId) {
            handleRequestPropertyChange(fallbackPropertyId);
          }
          setRangeAnchor(null);
          setShowRequestComposer((prev) => !prev);
        }}
        className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow-[0_18px_45px_-25px_rgba(52,211,153,0.9)] transition hover:bg-emerald-400"
      >
        {showRequestComposer ? 'Close booking form' : 'New booking request'}
      </button>
    </div>
  );


  return (
    <AdminPage
      title="Bookings management"
      description="Review requests, manage availability, and coordinate with owners."
      actions={headerActions}
    >
      {isLoading ? (
        <AdminSection subdued>
          <p className="text-sm text-muted-foreground">Loading bookings…</p>
        </AdminSection>
      ) : null}

      <AdminMetricGrid className="md:grid-cols-3">
        <AdminMetric label="Pending requests" value={pendingRequests.length} />
      <button
        type="button"
        disabled={upcomingApprovedBookings.length === 0}
        onClick={() => {
          if (upcomingApprovedBookings.length === 0) return;
          setViewMode('list');
          requestAnimationFrame(() => {
            document.getElementById('upcoming-bookings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
        className="text-left disabled:opacity-60"
      >
          <AdminMetric
            label="Upcoming bookings"
            value={upcomingApprovedBookings.length}
            description={upcomingApprovedBookings.length ? 'Tap to jump to the upcoming list' : undefined}
            className="transition hover:border-accent hover:shadow-[0_12px_30px_-24px_rgba(52,211,153,0.5)]"
          />
        </button>
        <AdminMetric
          label="Blackouts"
          value={availability?.items.filter((item) => item.type === 'blackout').length ?? 0}
        />
      </AdminMetricGrid>

      <AdminSection
        title="Voting dashboard"
        description="Review pending requests and cast your vote."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vote as
            <div className="w-52">
              <Select
                value={votingOwnershipId ?? ''}
                onChange={(event) => setVotingOwnershipId(event.target.value ? Number(event.target.value) : null)}
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
              </Select>
            </div>
          </div>
        </div>

        {!selectedFilterProperty ? (
          <p className="rounded-xl border border-default bg-background-muted px-4 py-3 text-sm text-muted-foreground shadow-soft">
            Select a property above to see pending requests and vote.
          </p>
        ) : pendingRequests.length === 0 ? (
          <p className="rounded-xl border border-default bg-background-muted px-4 py-3 text-sm text-muted-foreground shadow-soft">
            No pending requests for {selectedFilterProperty.name}.
          </p>
        ) : (
          <div className="space-y-4">
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
      </AdminSection>
      {error && (
        <AdminSection subdued>
          <p className="text-sm text-destructive">{error}</p>
        </AdminSection>
      )}

      {viewMode === 'calendar' && (
        <AdminSection
          title="Availability calendar"
          description="Review availability, bookings, and blackout periods at a glance."
        >
          <div className="space-y-4">
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

                const startSelection = requestFormData.startDate;
                const endSelection = requestFormData.endDate;
                const hasCommittedRange = Boolean(startSelection && endSelection);
                const pendingAnchor = rangeAnchor;

                const startValue = startSelection || '';
                const endValue = endSelection || '';

                const hasPendingSelection = !hasCommittedRange && pendingAnchor !== null;
                const pendingStart = pendingAnchor ?? '';
                const pendingEndCandidate = !hasCommittedRange && pendingAnchor ? cell.iso : '';
                const isPendingInRange = hasPendingSelection
                  ? pendingStart <= cell.iso
                    ? pendingStart <= cell.iso && cell.iso <= pendingEndCandidate
                    : pendingEndCandidate <= cell.iso && cell.iso <= pendingStart
                  : false;

                const effectiveStart = hasCommittedRange ? startValue : pendingAnchor ?? '';
                const effectiveEnd = hasCommittedRange ? endValue : pendingEndCandidate || pendingStart || '';

                const isInRange =
                  effectiveStart && effectiveEnd
                    ? effectiveStart <= cell.iso && cell.iso <= effectiveEnd
                    : isPendingInRange;

                const isRangeEndpoint = hasCommittedRange
                  ? cell.iso === startValue || cell.iso === endValue
                  : pendingAnchor
                  ? cell.iso === pendingAnchor
                  : false;

                const isPendingSelection = !hasCommittedRange && pendingAnchor === cell.iso;

                const cellClasses = [
                  'min-h-[5.5rem] border border-default bg-background p-2 text-xs transition',
                  cell.inCurrentMonth ? 'text-foreground' : 'bg-background-muted text-muted-foreground',
                  !cell.available ? 'ring-1 ring-rose-500/60' : '',
                  cell.isToday ? 'ring-1 ring-emerald-400/70' : '',
                  isInteractive ? 'hover:bg-background-muted cursor-pointer' : 'cursor-default',
                  isInRange
                    ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-100'
                    : '',
                  isRangeEndpoint
                    ? 'ring-2 ring-emerald-500 text-emerald-600 dark:text-emerald-100 font-semibold'
                    : '',
                  isPendingSelection
                    ? 'ring-2 ring-emerald-400 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-100'
                    : '',
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
        </AdminSection>
      )}
      <AdminSection
        title="Filter by property"
        description="Narrow results to a single home or review everything."
      >
        <div className="max-w-md">
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
      </AdminSection>

      {showRequestComposer ? (
        <AdminSection
          title="New booking request"
          description="Draft a new stay and include the owners who should review it."
        >
          {requestError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {requestError}
            </div>
          ) : null}

          <form onSubmit={handleCreateRequest} className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</label>
              <Select
                value={requestFormData.propertyId || ''}
                onChange={(event) => {
                  const propertyId = Number(event.target.value);
                  if (Number.isNaN(propertyId) || propertyId === 0) {
                    return;
                  }
                  handleRequestPropertyChange(propertyId);
                }}
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                    {property.location ? ` · ${property.location}` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                  min={requestFormData.startDate || undefined}
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
                className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {requestSubmitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRequestComposer(false);
                  setRequestError(null);
                  setRangeAnchor(null);
                }}
                className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-foreground transition hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminSection>
      ) : null}

      {viewMode === 'list' && (
        <>
          {upcomingApprovedBookings.length > 0 ? renderBookingSection({
            id: 'upcoming-bookings',
            title: 'Upcoming bookings',
            description: 'Approved stays that haven’t started yet.',
            bookings: upcomingApprovedBookings,
          }) : null}

          {renderBookingSection({
            id: 'all-bookings',
            title: 'All bookings',
            description: 'Full history including pending and past stays.',
            bookings,
          })}

          {expandedBooking ? (
            <AdminSection
              title={`Booking #${expandedBooking.id}`}
              description="Breakdown of participants, timeline, and decisions."
            >
              <AdminSplit
                className="items-start gap-6"
                primary={
                  <AdminCard className="space-y-4">
                    <header className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold uppercase tracking-wide">Participants</span>
                      <span>{expandedBooking.participants.length} total</span>
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
                              ? [ownershipOwner.firstName, ownershipOwner.lastName].filter(Boolean).join(' ') ||
                                ownershipOwner.email
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
                  </AdminCard>
                }
                secondary={
                  <AdminCard className="space-y-4" title="Actions & timeline">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedBookingId(null)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        Close
                      </button>
                      {expandedBooking.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleConfirm(expandedBooking.id);
                          }}
                          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          Confirm booking
                        </button>
                      ) : null}
                      {expandedBooking.status !== 'cancelled' ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleCancel(expandedBooking.id);
                          }}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          Cancel booking
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          void handleDelete(expandedBooking.id);
                        }}
                        className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        Delete booking
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground opacity-60"
                        disabled
                        title="Edit booking coming soon"
                      >
                        Edit booking
                      </button>
                    </div>

                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h3>
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
                    </section>
                  </AdminCard>
                }
              />
            </AdminSection>
          ) : null}
        </>
      )}
    </AdminPage>
  );
}
