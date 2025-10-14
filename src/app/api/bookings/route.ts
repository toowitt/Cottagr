import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus, Prisma, type Booking } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BookingCreateSchema, BookingListQuerySchema } from '@/lib/validation';
import {
  bookingInclude,
  calculateNights,
  coerceParticipants,
  serializeBooking,
} from './utils';

// Overlap: [aStart, aEnd) intersects [bStart, bEnd)
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && aEnd > bStart;

declare global {
  var __TEST_PRISMA__: typeof prisma | undefined;
}

const db: typeof prisma = globalThis.__TEST_PRISMA__ ?? prisma;

const bookingModel = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Booking');
const bookingScalarFields = new Set(
  bookingModel?.fields.filter((field) => field.kind === 'scalar').map((field) => field.name) ?? []
);
const bookingRelationFields = new Set(
  bookingModel?.fields.filter((field) => field.kind === 'object').map((field) => field.name) ?? []
);
const supportsRequestorOwnershipId = bookingScalarFields.has('requestorOwnershipId');
const supportsRequestorOwnershipRelation = bookingRelationFields.has('requestorOwnership');
const supportsRequestorUserId = bookingScalarFields.has('requestorUserId');
const supportsCreatedByOwnershipId = bookingScalarFields.has('createdByOwnershipId');
const supportsCreatedByOwnershipRelation = bookingRelationFields.has('createdByOwnership');
const supportsRequestorRelation = bookingRelationFields.has('requestor');
const supportsPropertyRelation = bookingRelationFields.has('property');
const supportsPolicySnapshot = bookingScalarFields.has('policySnapshot');
const supportsTimelineCreate = Prisma.dmmf.datamodel.models.some((model) => model.name === 'BookingTimelineEvent');
const supportsParticipantCreate = Prisma.dmmf.datamodel.models.some((model) => model.name === 'BookingParticipant');

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

    const bookings = await db.booking.findMany({
      where: propertyId ? { propertyId } : undefined,
      include: bookingInclude,
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ bookings: bookings.map(serializeBooking) });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch bookings' },
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
      requestorOwnershipId,
      requestorUserId,
      startDate,
      endDate,
      guestName,
      guestEmail,
      notes,
      participants: participantInput,
    } = validation.data;

    if (!createdByOwnershipId && !requestorOwnershipId) {
      return NextResponse.json(
        { error: 'A requesting ownership is required' },
        { status: 400 }
      );
    }

    const property = await db.property.findUnique({
      where: { id: propertyId },
      include: {
        ownerships: {
          include: { owner: true },
        },
      },
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

    const nights = calculateNights(start, end);

    if (nights < property.minNights) {
      return NextResponse.json(
        { error: `Minimum stay is ${property.minNights} nights` },
        { status: 400 }
      );
    }

    const effectiveRequestorOwnershipId = requestorOwnershipId ?? createdByOwnershipId ?? null;

    if (createdByOwnershipId) {
      const requestingOwnership = property.ownerships.find((ownership) => ownership.id === createdByOwnershipId);
      if (!requestingOwnership) {
        return NextResponse.json(
          { error: 'Ownership record not found for property' },
          { status: 400 }
        );
      }
    }

    const participants = coerceParticipants(participantInput, guestName, guestEmail);

    let resolvedRequestorUserId = requestorUserId ?? null;

    if (participants.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    const requestorOwnershipRecord = effectiveRequestorOwnershipId
      ? property.ownerships.find((o) => o.id === effectiveRequestorOwnershipId)
      : undefined;

    if (effectiveRequestorOwnershipId && !requestorOwnershipRecord) {
      return NextResponse.json(
        { error: 'Requesting ownership is not linked to the property' },
        { status: 400 }
      );
    }

    if (!resolvedRequestorUserId && requestorOwnershipRecord?.owner.userId) {
      resolvedRequestorUserId = requestorOwnershipRecord.owner.userId;
    }

    for (const participant of participants) {
      if (participant.ownershipId) {
        const ownershipExists = property.ownerships.some((ownership) => ownership.id === participant.ownershipId);
        if (!ownershipExists) {
          return NextResponse.json(
            { error: 'Participant ownership does not belong to this property' },
            { status: 400 }
          );
        }
      }
    }

    // Ensure the requestor is represented in the participants list if possible
    if (
      effectiveRequestorOwnershipId &&
      !participants.some((p) => p.ownershipId === effectiveRequestorOwnershipId) &&
      requestorOwnershipRecord
    ) {
      const displayName =
        (requestorOwnershipRecord.owner.firstName && requestorOwnershipRecord.owner.lastName
          ? `${requestorOwnershipRecord.owner.firstName} ${requestorOwnershipRecord.owner.lastName}`
          : requestorOwnershipRecord.owner.firstName || requestorOwnershipRecord.owner.email)
        ?? 'Owner';
      participants.unshift({
        role: 'OWNER',
        ownershipId: requestorOwnershipRecord.id,
        userId: requestorOwnershipRecord.owner.userId ?? undefined,
        displayName,
        email: requestorOwnershipRecord.owner.email ?? undefined,
      });
    }

    // Unavailability check: bookings & blackouts overlapping
    const [existingBookings, blackouts] = await Promise.all([
      db.booking.findMany({
        where: {
          propertyId,
          status: { not: BookingStatus.cancelled },
          AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
        },
        select: { id: true, startDate: true, endDate: true },
      }),
      db.blackout.findMany({
        where: {
          propertyId,
          AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
        },
        select: { id: true, startDate: true, endDate: true },
      }),
    ]);

    const hasOverlap =
      existingBookings.some((b) => overlaps(b.startDate, b.endDate, start, end)) ||
      blackouts.some((b) => overlaps(b.startDate, b.endDate, start, end));
    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Selected dates are unavailable' },
        { status: 409 }
      );
    }

    const totalAmount = property.nightlyRate * nights + property.cleaningFee;
    const policySnapshot = property.approvalPolicy
      ? {
        strategy: property.approvalPolicy,
      }
      : null;
    const normalizedPolicySnapshot =
      policySnapshot === null ? Prisma.JsonNull : policySnapshot;

    const booking = await prisma.$transaction(async (tx) => {
      const baseBookingFields = {
        startDate: start,
        endDate: end,
        guestName: guestName ?? null,
        guestEmail: guestEmail ?? null,
        requestNotes: notes ?? null,
        status: BookingStatus.pending,
        totalAmount,
        ...(supportsPolicySnapshot ? { policySnapshot: normalizedPolicySnapshot } : {}),
      };

      let createdBooking: Booking;

      const canUseUnchecked = supportsCreatedByOwnershipId && supportsRequestorOwnershipId;
      const shouldUseRelationalCreate = !canUseUnchecked && supportsPropertyRelation;

      if (shouldUseRelationalCreate) {
        const relationalData: Prisma.BookingCreateInput = {
          ...baseBookingFields,
          property: { connect: { id: propertyId } },
          ...(supportsCreatedByOwnershipRelation && createdByOwnershipId
            ? { createdByOwnership: { connect: { id: createdByOwnershipId } } }
            : {}),
          ...(supportsRequestorOwnershipRelation && effectiveRequestorOwnershipId
            ? { requestorOwnership: { connect: { id: effectiveRequestorOwnershipId } } }
            : {}),
          ...(supportsRequestorRelation && resolvedRequestorUserId
            ? { requestor: { connect: { id: resolvedRequestorUserId } } }
            : {}),
        };

        createdBooking = await tx.booking.create({ data: relationalData });
      } else {
        const uncheckedData: Prisma.BookingUncheckedCreateInput = {
          ...baseBookingFields,
          propertyId,
          ...(supportsCreatedByOwnershipId
            ? { createdByOwnershipId: createdByOwnershipId ?? null }
            : {}),
          ...(supportsRequestorOwnershipId
            ? { requestorOwnershipId: effectiveRequestorOwnershipId }
            : {}),
          ...(supportsRequestorUserId ? { requestorUserId: resolvedRequestorUserId } : {}),
        };

        createdBooking = await tx.booking.create({ data: uncheckedData });
      }

      if (supportsParticipantCreate) {
        for (const participant of participants) {
          await tx.bookingParticipant.create({
            data: {
              bookingId: createdBooking.id,
              role: participant.role,
              userId: participant.userId ?? null,
              ownershipId: participant.ownershipId ?? null,
              displayName: participant.displayName,
              email: participant.email ?? null,
              nights: participant.nights ?? nights,
            },
          });
        }
      }

      if (supportsTimelineCreate) {
        await tx.bookingTimelineEvent.create({
          data: {
            bookingId: createdBooking.id,
            eventType: 'request_created',
            message: 'Booking request created',
            actorOwnershipId: effectiveRequestorOwnershipId,
            actorUserId: resolvedRequestorUserId,
            payload: {
              startDate,
              endDate,
              nights,
              notes,
              participants,
            },
          },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: createdBooking.id },
        include: bookingInclude,
      });
    });

    return NextResponse.json(serializeBooking(booking), { status: 201 });
  } catch (err) {
    console.error('POST /api/bookings error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create booking' },
      { status: 500 }
    );
  }
}
