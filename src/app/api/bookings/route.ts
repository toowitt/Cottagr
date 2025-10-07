import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  BookingCreateSchema,
  BookingListQuerySchema,
} from '@/lib/validation';
import { formatCents } from '@/lib/money';

// Overlap: [aStart, aEnd) intersects [bStart, bEnd)
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && aEnd > bStart;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = BookingListQuerySchema.safeParse({
      propertyId: searchParams.get('propertyId')
        ? Number(searchParams.get('propertyId'))
        : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { propertyId } = parsed.data;

    const bookings = await prisma.booking.findMany({
      where: propertyId ? { propertyId } : undefined,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
          },
        },
        createdByOwnership: {
          include: { owner: true },
        },
        votes: {
          include: {
            ownership: {
              include: { owner: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const serialized = bookings.map((booking) => ({
      id: booking.id,
      propertyId: booking.propertyId,
      createdByOwnershipId: booking.createdByOwnershipId,
      createdBy: booking.createdByOwnership
        ? {
            ownershipId: booking.createdByOwnership.id,
            role: booking.createdByOwnership.role,
            shareBps: booking.createdByOwnership.shareBps,
            votingPower: booking.createdByOwnership.votingPower,
            owner: {
              id: booking.createdByOwnership.owner.id,
              email: booking.createdByOwnership.owner.email,
              firstName: booking.createdByOwnership.owner.firstName,
              lastName: booking.createdByOwnership.owner.lastName,
            },
          }
        : null,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      requestNotes: booking.requestNotes,
      status: booking.status,
      decisionSummary: booking.decisionSummary,
      totalAmount: booking.totalAmount,
      totalFormatted: formatCents(booking.totalAmount),
      property: booking.property
        ? {
            id: booking.property.id,
            name: booking.property.name,
            slug: booking.property.slug,
            location: booking.property.location,
          }
        : null,
      votes: booking.votes.map((vote) => ({
        id: vote.id,
        choice: vote.choice,
        rationale: vote.rationale,
        createdAt: vote.createdAt.toISOString(),
        ownershipId: vote.ownershipId,
        owner: {
          id: vote.ownership.owner.id,
          firstName: vote.ownership.owner.firstName,
          lastName: vote.ownership.owner.lastName,
          email: vote.ownership.owner.email,
        },
        ownership: {
          role: vote.ownership.role,
          votingPower: vote.ownership.votingPower,
          shareBps: vote.ownership.shareBps,
        },
      })),
    }));

    return NextResponse.json({ bookings: serialized });
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

    const {
      propertyId,
      createdByOwnershipId,
      startDate,
      endDate,
      guestName,
      guestEmail,
      notes,
    } = validation.data;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { ownerships: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const requestingOwnership = property.ownerships.find(
      (ownership) => ownership.id === createdByOwnershipId
    );
    if (!requestingOwnership) {
      return NextResponse.json(
        { error: 'Ownership record not found for property' },
        { status: 400 }
      );
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
          status: { not: BookingStatus.cancelled },
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
        createdByOwnershipId,
        startDate: start,
        endDate: end,
        guestName,
        guestEmail,
        requestNotes: notes ?? null,
        status: BookingStatus.pending,
        totalAmount,
      },
      include: {
        createdByOwnership: {
          include: { owner: true },
        },
        votes: {
          include: {
            ownership: {
              include: { owner: true },
            },
          },
        },
      },
    });

    const payload = {
      id: booking.id,
      status: booking.status,
      totalAmount,
      totalFormatted: formatCents(totalAmount),
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    console.error('POST /api/bookings error:', err);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
