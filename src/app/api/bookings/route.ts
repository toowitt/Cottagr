
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let whereClause: any = {}

    if (propertyId) {
      whereClause.propertyId = parseInt(propertyId)
    }

    if (from && to) {
      whereClause.OR = [
        {
          startDate: {
            lte: new Date(to)
          },
          endDate: {
            gte: new Date(from)
          }
        }
      ]
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        property: true
      }
    })
    return NextResponse.json(bookings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { propertyId, startDate, endDate, guestName, guestEmail } = body

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Validate dates
    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Check for overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId: parseInt(propertyId),
        OR: [
          {
            startDate: {
              lte: end
            },
            endDate: {
              gte: start
            }
          }
        ]
      }
    })

    if (overlappingBookings.length > 0) {
      return NextResponse.json({ error: 'Booking dates overlap with existing booking' }, { status: 409 })
    }

    // Get property details for pricing
    const property = await prisma.property.findUnique({
      where: { id: parseInt(propertyId) }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Calculate nights and total amount
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = (property.nightlyRate * nights) + property.cleaningFee

    const booking = await prisma.booking.create({
      data: {
        propertyId: parseInt(propertyId),
        startDate: start,
        endDate: end,
        guestName,
        guestEmail,
        status: 'pending',
        totalAmount
      },
      include: {
        property: true
      }
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
