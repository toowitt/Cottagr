'use client'

import { useState, useEffect, useCallback, type ReactElement } from 'react'

interface OwnerSummary {
  id: number
  firstName: string
  lastName?: string | null
  email: string
}

interface OwnershipSummary {
  id: number
  role: string
  shareBps: number
  votingPower: number
  owner: OwnerSummary
}

interface Property {
  id: number
  name: string
  slug: string
  location: string | null
  nightlyRate: number
  minNights: number
  approvalPolicy: string
  ownerships: OwnershipSummary[]
}

type BookingVoteChoice = 'approve' | 'reject' | 'abstain'

interface BookingVote {
  id: number
  choice: BookingVoteChoice
  rationale: string | null
  createdAt: string
  ownershipId: number
  owner: OwnerSummary
  ownership: {
    role: string
    votingPower: number
    shareBps: number
  }
}

interface Booking {
  id: number
  propertyId: number
  createdByOwnershipId: number | null
  startDate: string
  endDate: string
  guestName: string | null
  guestEmail: string | null
  status: string
  decisionSummary: string | null
  requestNotes: string | null
  totalAmount: number
  totalFormatted: string
  votes: BookingVote[]
  createdBy: {
    ownershipId: number
    role: string
    shareBps: number
    votingPower: number
    owner: OwnerSummary
  } | null
}

interface BookingCalendarProps {
  propertyId: number
  startDate: string
  endDate: string
  onRangeChange: (startDate: string, endDate: string) => void
}

function AvailabilityPicker({ propertyId, startDate, endDate, onRangeChange }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      return new Date(startDate + 'T00:00:00')
    }
    const today = new Date()
    today.setDate(1)
    return today
  })
  const [days, setDays] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [selectedStart, setSelectedStart] = useState<string | null>(startDate || null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(endDate || null)

  useEffect(() => {
    setSelectedStart(startDate || null)
  }, [startDate])

  useEffect(() => {
    setSelectedEnd(endDate || null)
  }, [endDate])

  useEffect(() => {
    if (!propertyId) return

    const controller = new AbortController()
    async function fetchAvailability(month: Date) {
      setLoading(true)
      const year = month.getFullYear()
      const monthIndex = month.getMonth()
      const rangeStart = new Date(year, monthIndex, 1)
      const rangeEnd = new Date(year, monthIndex + 1, 0)
      const next = new Date(rangeEnd)
      next.setDate(rangeEnd.getDate() + 1)

      const from = rangeStart.toISOString().split('T')[0]
      const to = next.toISOString().split('T')[0]

      try {
        const response = await fetch(
          `/api/availability?propertyId=${propertyId}&from=${from}&to=${to}`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error('Failed to load availability')
        }
        const data = await response.json()
        const availability: Record<string, boolean> = {}
        for (const day of data.days ?? []) {
          availability[day.date] = Boolean(day.available)
        }
        setDays(availability)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err)
          setDays({})
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability(currentMonth)
    return () => controller.abort()
  }, [propertyId, currentMonth])

  const moveMonth = (direction: 'prev' | 'next') => {
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(nextMonth)
  }

  const isRangeAvailable = (start: string, end: string) => {
    if (!start || !end) return false
    if (end <= start) return false
    const cursor = new Date(start + 'T00:00:00')
    const stop = new Date(end + 'T00:00:00')
    while (cursor < stop) {
      const key = cursor.toISOString().split('T')[0]
      if (!days[key]) {
        return false
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return true
  }

  const handleDayClick = (day: string) => {
    if (!days[day]) return

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(day)
      setSelectedEnd(null)
      onRangeChange(day, '')
      return
    }

    if (day <= selectedStart) {
      setSelectedStart(day)
      setSelectedEnd(null)
      onRangeChange(day, '')
      return
    }

    if (!isRangeAvailable(selectedStart, day)) {
      setSelectedStart(day)
      setSelectedEnd(null)
      onRangeChange(day, '')
      return
    }

    setSelectedEnd(day)
    onRangeChange(selectedStart, day)
  }

  const currentLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const cells = (() => {
    const result: ReactElement[] = []
    const base = new Date(currentMonth)
    base.setDate(1)
    const startWeekday = base.getDay()
    base.setDate(base.getDate() - startWeekday)

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (const weekday of weekdays) {
      result.push(
        <div
          key={`label-${weekday}`}
          className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          {weekday}
        </div>
      )
    }

    for (let i = 0; i < 42; i++) {
      const date = new Date(base)
      date.setDate(base.getDate() + i)
      const key = date.toISOString().split('T')[0]
      const inMonth = date.getMonth() === currentMonth.getMonth()
      const isAvailable = Boolean(days[key])
      const isCheckIn = key === selectedStart
      const isCheckOut = key === selectedEnd
      const isSelected = isCheckIn || isCheckOut
      const isBetween =
        selectedStart && selectedEnd && key > selectedStart && key < selectedEnd

      const isUnavailable = inMonth && !isAvailable
      const isSelectable = inMonth && !isUnavailable

      let cellClasses = 'flex h-16 flex-col items-center justify-center border text-sm transition-colors '
      cellClasses += inMonth ? 'border-slate-800 bg-slate-950/70 text-slate-200 ' : 'border-slate-900 bg-slate-900/40 text-slate-600 '

      if (isUnavailable) {
        cellClasses += 'border-rose-500/40 bg-rose-500/25 text-rose-100 '
      }

      if (isSelectable) {
        cellClasses += 'hover:bg-emerald-500/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 '
      }

      if (isBetween) {
        cellClasses += 'bg-emerald-500/30 text-emerald-50 '
      }

      if (isSelected) {
        cellClasses += 'bg-emerald-500 text-white ring-2 ring-emerald-300 '
      }

      result.push(
        <button
          key={key}
          type="button"
          onClick={() => handleDayClick(key)}
          disabled={!isSelectable}
          className={cellClasses.trim()}
        >
          <span className="text-sm font-semibold">{date.getDate()}</span>
          {isCheckIn && <span className="mt-1 text-[10px] uppercase tracking-wide text-emerald-100">Check-in</span>}
          {isCheckOut && <span className="mt-1 text-[10px] uppercase tracking-wide text-emerald-100">Check-out</span>}
        </button>
      )
    }

    return result
  })()

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth('prev')}
          className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-200 hover:border-blue-500 hover:text-white"
        >
          ←
        </button>
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">{currentLabel}</span>
        <button
          type="button"
          onClick={() => moveMonth('next')}
          className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-200 hover:border-blue-500 hover:text-white"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-xl border border-slate-800">
        {loading ? (
          <div className="col-span-7 py-12 text-center text-sm text-slate-400">Loading availability…</div>
        ) : (
          cells
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Selected check-in/out</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-500/40" />
          <span>Selected range</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-rose-500/40" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voteSubmitting, setVoteSubmitting] = useState(false)
  const [activeOwnershipId, setActiveOwnershipId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    guestName: '',
    guestEmail: '',
    notes: ''
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const fetchProperties = useCallback(async () => {
    try {
      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      const data: Property[] = await response.json()
      setProperties(data)

      if (data.length > 0) {
        setSelectedPropertyId(prev => prev ?? data[0].id)
        setActiveOwnershipId(prev => prev ?? (data[0].ownerships[0]?.id ?? null))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  useEffect(() => {
    if (selectedPropertyId) {
      fetchBookings(selectedPropertyId)
    }
  }, [selectedPropertyId])

  async function fetchBookings(propertyId: number) {
    try {
      setError(null)
      const response = await fetch(`/api/bookings?propertyId=${propertyId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      const data: { bookings: Booking[] } = await response.json()
      setBookings(data.bookings)
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setBookings([])
    }
  }

  function validateForm(): string[] {
    const errors: string[] = []
    const selectedProperty = properties.find(p => p.id === selectedPropertyId)

    if (!selectedPropertyId) {
      errors.push('Please select a property')
    }

    if (!activeOwnershipId) {
      errors.push('Select which owner is making this request')
    }

    if (!formData.startDate) {
      errors.push('Start date is required')
    }

    if (!formData.endDate) {
      errors.push('End date is required')
    }

    if (!formData.guestName.trim()) {
      errors.push('Guest name is required')
    }

    if (!formData.guestEmail.trim()) {
      errors.push('Guest email is required')
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)

      if (endDate <= startDate) {
        errors.push('End date must be after start date')
      }

      if (selectedProperty) {
        const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        if (nights < selectedProperty.minNights) {
          errors.push(`Minimum stay is ${selectedProperty.minNights} nights`)
        }
      }
    }

    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors = validateForm()
    setValidationErrors(errors)

    if (errors.length > 0) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          createdByOwnershipId: activeOwnershipId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          guestName: formData.guestName,
          guestEmail: formData.guestEmail,
          notes: formData.notes || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      // Reset form
      setFormData({
        startDate: '',
        endDate: '',
        guestName: '',
        guestEmail: '',
        notes: ''
      })
      setValidationErrors([])

      // Refresh bookings list
      if (selectedPropertyId) {
        await fetchBookings(selectedPropertyId)
      }

      alert('Booking created successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  async function handleVote(bookingId: number, choice: BookingVoteChoice) {
    if (!selectedPropertyId) {
      setError('Select a property before voting')
      return
    }

    if (!activeOwnershipId) {
      setError('Select which owner you are before casting a vote')
      return
    }

    setVoteSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/booking-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          ownershipId: activeOwnershipId,
          choice,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record vote')
      }

      await fetchBookings(selectedPropertyId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record vote')
    } finally {
      setVoteSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold tracking-tight">Bookings</h1>
          <p className="mt-4 text-slate-300">Loading…</p>
        </div>
      </div>
    )
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Family Booking Hub</h1>
          <p className="mt-2 text-slate-300 max-w-2xl">
            Propose family stays, review requests, and keep approvals transparent across every co-owner.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Property Selection */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">Select property</h2>
          <p className="mt-1 text-sm text-slate-400">Pick the cottage and the owner identity you’re acting on behalf of.</p>
          <select
            value={selectedPropertyId || ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null
              setSelectedPropertyId(value)
              if (value) {
                const property = properties.find((p) => p.id === value)
                setActiveOwnershipId(property?.ownerships[0]?.id ?? null)
              } else {
                setActiveOwnershipId(null)
              }
            }}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Choose a property...</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} - {property.location ?? 'Location TBD'} ($
                {(property.nightlyRate / 100).toFixed(2)}/night, min {property.minNights} nights)
              </option>
            ))}
          </select>

          {selectedProperty && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Governance</p>
              <p className="mt-1 text-sm text-slate-200">
                Approval policy: <span className="font-medium text-white">{selectedProperty.approvalPolicy}</span>
              </p>
              <div className="mt-4 text-sm text-slate-300">
                <p className="font-medium text-slate-100">Ownership shares</p>
                <ul className="mt-2 space-y-2">
                  {selectedProperty.ownerships.map((ownership) => (
                    <li
                      key={ownership.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                    >
                      <span className="font-medium text-slate-100">
                        {ownership.owner.firstName} {ownership.owner.lastName ?? ''}
                      </span>
                      <span className="text-xs text-slate-400">
                        Share {(ownership.shareBps / 100).toFixed(2)}% · Power {ownership.votingPower}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  You are acting as
                </label>
                <select
                  value={activeOwnershipId ?? ''}
                  onChange={(event) =>
                    setActiveOwnershipId(event.target.value ? parseInt(event.target.value) : null)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Choose an owner...</option>
                  {selectedProperty.ownerships.map((ownership) => (
                    <option key={ownership.id} value={ownership.id}>
                      {ownership.owner.firstName} {ownership.owner.lastName ?? ''} ({ownership.role.toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Booking Form */}
        {selectedProperty && selectedPropertyId && (
          <section className="mb-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">
                Availability
              </h2>
              <p className="text-sm text-slate-400">
                Tap any open dates to prefill the booking form. Unavailable dates include existing stays,
                blackout periods, or pending approvals.
              </p>
              <AvailabilityPicker
                propertyId={selectedPropertyId}
                startDate={formData.startDate}
                endDate={formData.endDate}
                onRangeChange={(start, end) => {
                  handleInputChange('startDate', start)
                  handleInputChange('endDate', end)
                }}
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">Request stay</h2>
              <p className="mt-1 text-sm text-slate-400">
                Confirm the details you’d like co-owners to review before voting.
              </p>

              {validationErrors.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <ul className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Check-in</span>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Check-out</span>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Guest name</span>
                    <input
                      type="text"
                      value={formData.guestName}
                      onChange={(e) => handleInputChange('guestName', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Guest email</span>
                    <input
                      type="email"
                      value={formData.guestEmail}
                      onChange={(e) => handleInputChange('guestEmail', e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </label>
                </div>

                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Notes for co-owners</span>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={4}
                    placeholder="Share context, priority rules, or anything the family should consider."
                  />
                </label>

                {formData.startDate && formData.endDate && selectedProperty && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                    <p>
                      Nights: {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))}
                      {' '}| Rate: ${(selectedProperty.nightlyRate / 100).toFixed(2)}/night
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-slate-600"
                >
                  {submitting ? 'Submitting request…' : 'Submit for family approval'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Existing Bookings */}
        {selectedPropertyId && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-100">
                  Booking timeline for {selectedProperty?.name}
                </h2>
                <p className="text-sm text-slate-400">
                  Track every request, vote, and outcome in one transparent ledger.
                </p>
              </div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Showing {bookings.length} entries
              </div>
            </div>

            {bookings.length === 0 ? (
              <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
                No bookings found for this property.
              </p>
            ) : (
              <div className="mt-6 grid gap-4">
                {bookings.map((booking) => {
                  const statusStyles: Record<string, string> = {
                    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
                    pending: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
                    rejected: 'bg-rose-500/15 text-rose-200 border-rose-500/40',
                    cancelled: 'bg-slate-700/60 text-slate-300 border-slate-600/60',
                  }

                  const createdByName = booking.createdBy
                    ? `${booking.createdBy.owner.firstName} ${booking.createdBy.owner.lastName ?? ''}`.trim()
                    : 'Unknown'

                  const activeOwnership = selectedProperty?.ownerships.find(
                    (ownership) => ownership.id === activeOwnershipId
                  )

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-inner shadow-black/20 transition hover:border-blue-500/40"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100">{booking.guestName ?? 'Family stay'}</h3>
                          <p className="text-sm text-slate-400">{booking.guestEmail}</p>
                          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                            Requested by {createdByName}{' '}
                            {booking.createdBy ? `· Power ${booking.createdBy.votingPower}` : ''}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            statusStyles[booking.status] ?? 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Check-in</p>
                          <p className="font-medium text-slate-100">{new Date(booking.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Check-out</p>
                          <p className="font-medium text-slate-100">{new Date(booking.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                          <p className="font-medium text-slate-100">{booking.totalFormatted}</p>
                        </div>
                      </div>

                      {booking.requestNotes && (
                        <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                          <p className="font-semibold uppercase tracking-wide text-xs">Requester notes</p>
                          <p className="mt-1 leading-relaxed">{booking.requestNotes}</p>
                        </div>
                      )}

                      {booking.decisionSummary && (
                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                          <p className="font-semibold uppercase tracking-wide text-xs">Decision</p>
                          <p className="mt-1 leading-relaxed">{booking.decisionSummary}</p>
                        </div>
                      )}

                      <div>
                        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">Vote history</p>
                        {booking.votes.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">No votes yet.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-sm text-slate-300">
                            {booking.votes.map((vote) => (
                              <li key={vote.id}>
                                <span className="font-medium">{vote.owner.firstName} {vote.owner.lastName ?? ''}</span>
                                {': '}
                                <span className="capitalize">{vote.choice}</span>
                                {vote.rationale ? ` — ${vote.rationale}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {booking.status === 'pending' && (
                        <div className="mt-5 border-t border-slate-800 pt-4">
                          <p className="mb-3 text-sm text-slate-400">
                            {activeOwnership
                              ? `Voting as ${activeOwnership.owner.firstName} ${activeOwnership.owner.lastName ?? ''}`
                              : 'Select which owner you are to vote'}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:bg-slate-600"
                              onClick={() => handleVote(booking.id, 'approve')}
                              disabled={voteSubmitting || !activeOwnershipId}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:bg-slate-600"
                              onClick={() => handleVote(booking.id, 'reject')}
                              disabled={voteSubmitting || !activeOwnershipId}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500 disabled:border-slate-800 disabled:text-slate-500"
                              onClick={() => handleVote(booking.id, 'abstain')}
                              disabled={voteSubmitting || !activeOwnershipId}
                            >
                              Abstain
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
