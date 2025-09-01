
'use client'

import { useState, useEffect } from 'react'

interface Property {
  id: number
  name: string
  slug: string
  location: string
  nightlyRate: number
  minNights: number
}

interface Booking {
  id: number
  startDate: string
  endDate: string
  guestName: string
  guestEmail: string
  status: string
  totalAmount: number
  property: Property
}

export default function BookingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    guestName: '',
    guestEmail: ''
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    if (selectedPropertyId) {
      fetchBookings(selectedPropertyId)
    }
  }, [selectedPropertyId])

  async function fetchProperties() {
    try {
      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      const data = await response.json()
      setProperties(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function fetchBookings(propertyId: number) {
    try {
      const response = await fetch(`/api/bookings?propertyId=${propertyId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      const data = await response.json()
      setBookings(data)
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
          startDate: formData.startDate,
          endDate: formData.endDate,
          guestName: formData.guestName,
          guestEmail: formData.guestEmail
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
        guestEmail: ''
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Bookings</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Bookings</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Property Selection */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Property</h2>
          <select
            value={selectedPropertyId || ''}
            onChange={(e) => setSelectedPropertyId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full p-2 border rounded text-black"
          >
            <option value="">Choose a property...</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} - {property.location} (${property.nightlyRate}/night, min {property.minNights} nights)
              </option>
            ))}
          </select>
        </div>

        {/* Booking Form */}
        {selectedPropertyId && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Booking</h2>
            
            {validationErrors.length > 0 && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <ul>
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Check-in Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full p-2 border rounded text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Check-out Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full p-2 border rounded text-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={formData.guestName}
                    onChange={(e) => handleInputChange('guestName', e.target.value)}
                    className="w-full p-2 border rounded text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guest Email</label>
                  <input
                    type="email"
                    value={formData.guestEmail}
                    onChange={(e) => handleInputChange('guestEmail', e.target.value)}
                    className="w-full p-2 border rounded text-black"
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && selectedProperty && (
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm">
                    Nights: {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))} | 
                    Rate: ${selectedProperty.nightlyRate}/night
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {submitting ? 'Creating Booking...' : 'Create Booking'}
              </button>
            </form>
          </div>
        )}

        {/* Existing Bookings */}
        {selectedPropertyId && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              Existing Bookings for {selectedProperty?.name}
            </h2>

            {bookings.length === 0 ? (
              <p>No bookings found for this property.</p>
            ) : (
              <div className="grid gap-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white p-4 rounded border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{booking.guestName}</h3>
                        <p className="text-sm text-gray-600">{booking.guestEmail}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-sm ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Check-in</p>
                        <p className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Check-out</p>
                        <p className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-medium">${(booking.totalAmount / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
