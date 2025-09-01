import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingCreateSchema, AvailabilityQuerySchema } from '@/lib/validation'
import { formatCents } from '@/lib/money'

// GET Bookings API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyIdParam = searchParams.get('propertyId')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    // Validate query parameters using Zod
    const queryParams = AvailabilityQuerySchema.safeParse({
      propertyId: propertyIdParam ? parseInt(propertyIdParam) : undefined,
      from: fromParam || undefined,
      to: toParam || undefined
    })

    if (!queryParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryParams.error.errors },
        { status: 400 }
      )
    }

    const { propertyId, from, to } = queryParams.data

    let whereClause: any = {}

    if (propertyId !== undefined) {
      whereClause.propertyId = propertyId
    }

    if (from && to) {
      try {
        const fromDate = new Date(from)
        const toDate = new Date(to)

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          throw new Error('Invalid date format')
        }

        whereClause.AND = [
          { startDate: { lt: toDate } },
          { endDate: { gt: fromDate } }
        ]
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        )
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
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
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

// POST Booking API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const validation = BookingCreateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { propertyId, startDate, endDate, guestName, guestEmail } = validation.data

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

    // Calculate nights
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    // Validate property exists and get minNights requirement
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        nightlyRate: true,
        cleaningFee: true,
        minNights: true
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check minimum nights requirement
    if (nights < property.minNights) {
      return NextResponse.json(
        { error: `Minimum stay is ${property.minNights} nights` },
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

    // Get season prices that overlap with the booking period
    const seasonPrices = await prisma.seasonPrice.findMany({
      where: {
        propertyId,
        AND: [
          { startDate: { lt: end } },
          { endDate: { gt: start } }
        ]
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    // Calculate total amount with per-night pricing
    let totalNightlyAmount = 0
    const currentDate = new Date(start)

    while (currentDate < end) {
      // Normalize to UTC midnight for consistent comparison
      const dayStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      )

      // Find applicable season price for this night
      let nightlyRate = property.nightlyRate

      const applicableSeasonPrice = seasonPrices.find((season) => {
        const seasonStart = new Date(season.startDate)
        const seasonEnd = new Date(season.endDate)

        // Check if night falls within season range
        return seasonStart <= dayStart && seasonEnd > dayStart
      })

      if (applicableSeasonPrice) {
        nightlyRate = applicableSeasonPrice.nightlyRate
      }

      totalNightlyAmount += nightlyRate

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const totalAmount = totalNightlyAmount + property.cleaningFee

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
      }
    })

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      totalAmount: formatCents(booking.totalAmount)
    }, { status: 201 })

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}