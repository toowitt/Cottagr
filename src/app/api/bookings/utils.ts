import { Prisma } from '@prisma/client';
import { formatCents } from '@/lib/money';
import type { BookingParticipantInput } from '@/lib/validation';

export const bookingInclude = {
  property: {
    select: {
      id: true,
      name: true,
      slug: true,
      location: true,
    },
  },
  createdByOwnership: {
    include: { ownerProfile: true },
  },
  votes: {
    include: {
      ownership: {
        include: { ownerProfile: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  participants: {
    include: {
      ownership: {
        include: { ownerProfile: true },
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
    orderBy: { createdAt: 'asc' as const },
  },
  timeline: {
    include: {
      actorOwnership: {
        include: { ownerProfile: true },
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
    orderBy: { createdAt: 'asc' as const },
  },
  usageSnapshots: {
    orderBy: { calculatedAt: 'desc' as const },
  },
} satisfies Prisma.BookingInclude;

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
      ownerProfile: ownership.ownerProfile
        ? {
          id: ownership.ownerProfile.id,
          email: ownership.ownerProfile.email,
          firstName: ownership.ownerProfile.firstName,
          lastName: ownership.ownerProfile.lastName,
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
      ownerProfile: vote.ownership.ownerProfile
        ? {
          id: vote.ownership.ownerProfile.id,
          firstName: vote.ownership.ownerProfile.firstName,
          lastName: vote.ownership.ownerProfile.lastName,
          email: vote.ownership.ownerProfile.email,
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
          ownerProfile: participant.ownership.ownerProfile
            ? {
              id: participant.ownership.ownerProfile.id,
              email: participant.ownership.ownerProfile.email,
              firstName: participant.ownership.ownerProfile.firstName,
              lastName: participant.ownership.ownerProfile.lastName,
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
            ownerProfile: event.actorOwnership.ownerProfile
              ? {
                id: event.actorOwnership.ownerProfile.id,
                email: event.actorOwnership.ownerProfile.email,
                firstName: event.actorOwnership.ownerProfile.firstName,
                lastName: event.actorOwnership.ownerProfile.lastName,
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
