
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
    // Load property data
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        nightlyRate: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Load season prices, blackouts, and bookings for the date range
    const [seasonPrices, blackouts, bookings] = await Promise.all([
      prisma.seasonPrice.findMany({
        where: {
          propertyId,
          AND: [
            { startDate: { lte: toDate } },
            { endDate: { gte: fromDate } },
          ],
        },
      }),
      prisma.blackout.findMany({
        where: {
          propertyId,
          AND: [
            { startDate: { lte: toDate } },
            { endDate: { gte: fromDate } },
          ],
        },
      }),
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { not: 'cancelled' },
          AND: [
            { startDate: { lte: toDate } },
            { endDate: { gte: fromDate } },
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
        
        // Overlap logic: (startA <= endB) && (endA >= startB)
        return itemStart < dayEnd && itemEnd >= dayStart;
      });

      // Determine nightly rate (check season prices first)
      let nightlyRate = property.nightlyRate;
      
      const applicableSeasonPrice = seasonPrices.find((season) => {
        const seasonStart = new Date(season.startDate);
        const seasonEnd = new Date(season.endDate);
        
        // Check if day falls within season range
        return seasonStart <= dayStart && seasonEnd > dayStart;
      });

      if (applicableSeasonPrice) {
        nightlyRate = applicableSeasonPrice.nightlyRate;
      }

      days.push({
        date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD format
        available: !isUnavailable,
        nightlyRate,
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
