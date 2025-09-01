import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        property: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(bookings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyId, startDate, endDate, guestName, guestEmail } = body

    // Input validation
    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, startDate, endDate' },
        { status: 400 }
      )
    }

    // Validate property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Parse and validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Check for conflicts with existing bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        propertyId,
        status: { not: 'cancelled' },
        AND: [
          { startDate: { lt: end } },
          { endDate: { gt: start } }
        ]
      }
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Property is not available for selected dates' },
        { status: 409 }
      )
    }

    // Check for blackout periods
    const blackoutConflict = await prisma.blackout.findFirst({
      where: {
        propertyId,
        AND: [
          { startDate: { lt: end } },
          { endDate: { gt: start } }
        ]
      }
    })

    if (blackoutConflict) {
      return NextResponse.json(
        { error: 'Property is not available for selected dates (blackout period)' },
        { status: 409 }
      )
    }

    // Calculate total amount (simplified - using base rate for now)
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = (nights * property.nightlyRate) + property.cleaningFee

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        propertyId,
        startDate: start,
        endDate: end,
        guestName: guestName || 'Guest',
        guestEmail: guestEmail || '',
        totalAmount,
        status: 'pending'
      },
      include: {
        property: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json(booking, { status: 201 })

  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}