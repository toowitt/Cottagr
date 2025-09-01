import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const propertyIdParam = searchParams.get('propertyId');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  // Input validation
  if (!propertyIdParam || !fromParam || !toParam) {
    return NextResponse.json(
      { error: 'Missing required parameters: propertyId, from, to' },
      { status: 400 }
    );
  }

  const propertyId = parseInt(propertyIdParam);
  if (isNaN(propertyId)) {
    return NextResponse.json(
      { error: 'propertyId must be a valid number' },
      { status: 400 }
    );
  }

  let fromDate: Date;
  let toDate: Date;

  try {
    fromDate = new Date(fromParam);
    toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new Error('Invalid date format');
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    // Load bookings and blackouts that overlap with the date range
    const [bookings, blackouts] = await Promise.all([
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { not: 'cancelled' },
          AND: [
            { startDate: { lt: toDate } },
            { endDate: { gt: fromDate } },
          ],
        },
      }),
      prisma.blackout.findMany({
        where: {
          propertyId,
          AND: [
            { startDate: { lt: toDate } },
            { endDate: { gt: fromDate } },
          ],
        },
      }),
    ]);

    // Generate day-by-day availability
    const days = [];
    const currentDate = new Date(fromDate);

    while (currentDate < toDate) {
      // Normalize to UTC midnight for consistent comparison
      const dayStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Check if day is unavailable due to bookings or blackouts
      const isUnavailable = [...bookings, ...blackouts].some((item) => {
        const itemStart = new Date(item.startDate);
        const itemEnd = new Date(item.endDate);

        // Overlap logic: (startA < endB) && (endA > startB)
        return itemStart < dayEnd && itemEnd > dayStart;
      });

      days.push({
        date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD format
        available: !isUnavailable,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({ days });

  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}