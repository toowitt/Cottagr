import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BookingCreateSchema, AvailabilityQuerySchema } from '@/lib/validation';
import { formatCents } from '@/lib/money';

// Overlap: [aStart, aEnd) intersects [bStart, bEnd)
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && aEnd > bStart;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = AvailabilityQuerySchema.safeParse({
      propertyId: searchParams.get('propertyId')
        ? Number(searchParams.get('propertyId'))
        : undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { propertyId, from, to } = parsed.data;
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { not: 'cancelled' },
        AND: [{ startDate: { lt: toDate } }, { endDate: { gt: fromDate } }],
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = BookingCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { propertyId, startDate, endDate, guestName, guestEmail } =
      validation.data;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!(end > start)) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      );
    }

    // Nights at UTC midnight boundaries
    const startUTC = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate()
    );
    const endUTC = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate()
    );
    const nights = Math.ceil((endUTC - startUTC) / (1000 * 60 * 60 * 24));

    if (nights < property.minNights) {
      return NextResponse.json(
        { error: `Minimum stay is ${property.minNights} nights` },
        { status: 400 }
      );
    }

    // Unavailability check: bookings & blackouts overlapping
    const [existingBookings, blackouts] = await Promise.all([
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { not: 'cancelled' },
          AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
        },
        select: { id: true, startDate: true, endDate: true },
      }),
      prisma.blackout.findMany({
        where: {
          propertyId,
          AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
        },
        select: { id: true, startDate: true, endDate: true },
      }),
    ]);

    const hasOverlap =
      existingBookings.some(b => overlaps(b.startDate, b.endDate, start, end)) ||
      blackouts.some(b => overlaps(b.startDate, b.endDate, start, end));
    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Selected dates are unavailable' },
        { status: 409 }
      );
    }

    // Simple pricing (single-tenant): nights * nightlyRate + cleaningFee
    const totalAmount = property.nightlyRate * nights + property.cleaningFee;

    const booking = await prisma.booking.create({
      data: {
        propertyId,
        startDate: start,
        endDate: end,
        guestName: guestName ?? null,
        guestEmail: guestEmail ?? null,
        status: 'pending',
        totalAmount,
      },
    });

    return NextResponse.json(
      {
        id: booking.id,
        status: booking.status,
        totalAmount,
        totalFormatted: formatCents(totalAmount),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/bookings error:', err);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
