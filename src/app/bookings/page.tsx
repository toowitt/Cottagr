
'use client'

import { useState, useEffect } from 'react'

interface Property {
  id: string
  name: string
}

interface Booking {
  id: string
  propertyId: string
  start: string
  end: string
  status: string
  property: Property
}

export default function BookingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchProperties()
    fetchBookings()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      const data = await response.json()
      setProperties(data)
      if (data.length > 0) {
        setSelectedPropertyId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    }
  }

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings')
      const data = await response.json()
      setBookings(data)
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          start: startDate,
          end: endDate,
        }),
      })

      if (response.ok) {
        setStartDate('')
        setEndDate('')
        fetchBookings()
      }
    } catch (error) {
      console.error('Failed to create booking:', error)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Bookings</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Property</label>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Booking
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Existing Bookings</h2>
      <div className="space-y-2">
        {bookings.map((booking) => (
          <div key={booking.id} className="p-4 border rounded">
            <p><strong>Property:</strong> {booking.property.name}</p>
            <p><strong>Dates:</strong> {new Date(booking.start).toLocaleDateString()} - {new Date(booking.end).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {booking.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
