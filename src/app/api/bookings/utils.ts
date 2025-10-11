import { Prisma } from '@prisma/client';
import { formatCents } from '@/lib/money';
import type { BookingParticipantInput } from '@/lib/validation';

const bookingModel = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Booking');
const bookingRelations = new Set(
  bookingModel?.fields.filter((field) => field.kind === 'object').map((field) => field.name) ?? []
);

const include: Prisma.BookingInclude = {};

if (bookingRelations.has('property')) {
  include.property = {
    select: {
      id: true,
      name: true,
      slug: true,
      location: true,
    },
  };
}

if (bookingRelations.has('createdByOwnership')) {
  include.createdByOwnership = {
    include: { owner: true },
  };
}

if (bookingRelations.has('votes')) {
  include.votes = {
    include: {
      ownership: {
        include: { owner: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  };
}

if (bookingRelations.has('participants')) {
  include.participants = {
    include: {
      ownership: {
        include: { owner: true },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  };
}

if (bookingRelations.has('timeline')) {
  include.timeline = {
    include: {
      actorOwnership: {
        include: { owner: true },
      },
      actorUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  };
}

if (bookingRelations.has('usageSnapshots')) {
  include.usageSnapshots = {
    orderBy: { calculatedAt: 'desc' },
  };
}

export const bookingInclude = include;

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export const calculateNights = (start: Date, end: Date) => {
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.ceil((endUTC - startUTC) / (1000 * 60 * 60 * 24)));
};

const serializeOwner = (ownership: BookingWithRelations['createdByOwnership'] | null) =>
  ownership
    ? {
        ownershipId: ownership.id,
        role: ownership.role,
        shareBps: ownership.shareBps,
        votingPower: ownership.votingPower,
        owner: ownership.owner
          ? {
              id: ownership.owner.id,
              email: ownership.owner.email,
              firstName: ownership.owner.firstName,
              lastName: ownership.owner.lastName,
            }
          : null,
      }
    : null;

export const serializeBooking = (booking: BookingWithRelations) => {
  const nights = calculateNights(booking.startDate, booking.endDate);
  const participants = booking.participants ?? [];
  const timeline = booking.timeline ?? [];
  const usageSnapshots = booking.usageSnapshots ?? [];
  const votes = booking.votes ?? [];

  return {
    id: booking.id,
    propertyId: booking.propertyId,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    status: booking.status,
    decisionSummary: booking.decisionSummary,
    requestNotes: booking.requestNotes,
    totalAmount: booking.totalAmount,
    totalFormatted: formatCents(booking.totalAmount),
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    submittedAt: booking.submittedAt ? booking.submittedAt.toISOString() : null,
    decisionAt: booking.decisionAt ? booking.decisionAt.toISOString() : null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    policySnapshot: booking.policySnapshot,
    property: booking.property
      ? {
          id: booking.property.id,
          name: booking.property.name,
          slug: booking.property.slug,
          location: booking.property.location,
        }
      : null,
    createdBy: serializeOwner(booking.createdByOwnership),
    requestorUser: null,
    votes: votes.map((vote) => ({
      id: vote.id,
      choice: vote.choice,
      rationale: vote.rationale,
      createdAt: vote.createdAt.toISOString(),
      ownershipId: vote.ownershipId,
      owner: vote.ownership.owner
        ? {
            id: vote.ownership.owner.id,
            firstName: vote.ownership.owner.firstName,
            lastName: vote.ownership.owner.lastName,
            email: vote.ownership.owner.email,
          }
        : null,
      ownership: {
        role: vote.ownership.role,
        votingPower: vote.ownership.votingPower,
        shareBps: vote.ownership.shareBps,
      },
    })),
    participants: participants.map((participant) => ({
      id: participant.id,
      role: participant.role,
      displayName: participant.displayName,
      email: participant.email,
      nights: participant.nights ?? nights,
      user: participant.user
        ? {
            id: participant.user.id,
            email: participant.user.email,
            firstName: participant.user.firstName,
            lastName: participant.user.lastName,
          }
        : null,
      ownership: participant.ownership
        ? {
            id: participant.ownership.id,
            role: participant.ownership.role,
            shareBps: participant.ownership.shareBps,
            votingPower: participant.ownership.votingPower,
            owner: participant.ownership.owner
              ? {
                  id: participant.ownership.owner.id,
                  email: participant.ownership.owner.email,
                  firstName: participant.ownership.owner.firstName,
                  lastName: participant.ownership.owner.lastName,
                }
              : null,
          }
        : null,
    })),
    timeline: timeline.map((event) => ({
      id: event.id,
      type: event.eventType,
      message: event.message,
      payload: event.payload,
      createdAt: event.createdAt.toISOString(),
      actor: {
        user: event.actorUser
          ? {
              id: event.actorUser.id,
              email: event.actorUser.email,
              firstName: event.actorUser.firstName,
              lastName: event.actorUser.lastName,
            }
          : null,
        ownership: event.actorOwnership
          ? {
              id: event.actorOwnership.id,
              role: event.actorOwnership.role,
              shareBps: event.actorOwnership.shareBps,
              votingPower: event.actorOwnership.votingPower,
              owner: event.actorOwnership.owner
                ? {
                    id: event.actorOwnership.owner.id,
                    email: event.actorOwnership.owner.email,
                    firstName: event.actorOwnership.owner.firstName,
                    lastName: event.actorOwnership.owner.lastName,
                  }
                : null,
            }
          : null,
      },
    })),
    usageSnapshots: usageSnapshots.map((snapshot) => ({
      id: snapshot.id,
      participantRole: snapshot.participantRole,
      participantKey: snapshot.participantKey,
      season: snapshot.season,
      nights: snapshot.nights,
      calculatedAt: snapshot.calculatedAt.toISOString(),
    })),
  };
};

export const coerceParticipants = (
  participants: BookingParticipantInput[] | undefined,
  guestName: string | undefined,
  guestEmail: string | undefined,
): BookingParticipantInput[] => {
  if (participants && participants.length > 0) {
    return participants;
  }

  if (guestName) {
    return [
      {
        role: 'GUEST',
        displayName: guestName,
        email: guestEmail,
      },
    ];
  }

  return [];
};
