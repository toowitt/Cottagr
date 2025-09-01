import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Zod schema for availability query
const AvailabilityQuerySchema = z.object({
  propertyId: z.number().int(),
  from: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
  }),
  to: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
  }),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const propertyIdParam = searchParams.get('propertyId');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  // Input validation using Zod
  let validatedData;
  try {
    validatedData = AvailabilityQuerySchema.parse({
      propertyId: propertyIdParam ? parseInt(propertyIdParam) : undefined,
      from: fromParam,
      to: toParam,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  }

  const fromDate = new Date(validatedData.from);
  const toDate = new Date(validatedData.to);

  try {
    // Fetch bookings and blackouts that overlap with the date range
    const [bookings, blackouts] = await Promise.all([
      prisma.booking.findMany({
        where: {
          propertyId: validatedData.propertyId,
          status: { not: 'cancelled' },
          AND: [
            { startDate: { lt: toDate } },
            { endDate: { gt: fromDate } },
          ],
        },
      }),
      prisma.blackout.findMany({
        where: {
          propertyId: validatedData.propertyId,
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
        Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

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
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
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