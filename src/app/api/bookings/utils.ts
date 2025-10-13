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
        owner: (() => {
          const maybe = ownership as unknown as { owner?: { id: number; email?: string; firstName?: string; lastName?: string } } | null;
          const o = maybe?.owner ?? null;
          return o
            ? {
                id: o.id,
                email: o.email ?? null,
                firstName: o.firstName ?? null,
                lastName: o.lastName ?? null,
              }
            : null;
        })(),
    }
    : null;

export const serializeBooking = (booking: BookingWithRelations) => {
  // Local, permissive type for serialization to avoid depending on compile-time Prisma include shapes.
  type MaybeOwner = { id: number; email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  type MaybeOwnership = {
    id: number;
    role: string;
    shareBps: number;
    votingPower: number;
    owner?: MaybeOwner | null;
  } | null;

  type BookingForSerialize = {
    id: number;
    propertyId: number;
    startDate: Date;
    endDate: Date;
    status: string;
    decisionSummary?: string | null;
    requestNotes?: string | null;
    totalAmount: number;
    guestName?: string | null;
    guestEmail?: string | null;
    submittedAt?: Date | null;
    decisionAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    policySnapshot?: unknown;
    property?: { id: number; name: string; slug: string; location?: string | null } | null;
    createdByOwnership?: MaybeOwnership | null;
    votes?:
      | Array<{
          id: number;
          choice: string;
          rationale?: string | null;
          createdAt: Date;
          ownershipId?: number;
          ownership?: { role?: string; votingPower?: number; shareBps?: number; owner?: MaybeOwner } | null;
        }>
      | undefined;
    participants?:
      | Array<{
          id: number;
          role: string;
          displayName: string;
          email?: string | null;
          nights?: number | null;
          user?: { id: number; email?: string; firstName?: string; lastName?: string } | null;
          ownership?: MaybeOwnership | null;
        }>
      | undefined;
    timeline?:
      | Array<{
          id: number;
          eventType: string;
          message?: string | null;
          payload?: unknown;
          createdAt: Date;
          actorUser?: { id: number; email?: string; firstName?: string; lastName?: string } | null;
          actorOwnership?: MaybeOwnership | null;
        }>
      | undefined;
    usageSnapshots?: Array<{ id: number; participantRole: string; participantKey: string; season: string; nights: number; calculatedAt: Date }> | undefined;
  };

  const b = booking as unknown as BookingForSerialize;
  const nights = calculateNights(b.startDate, b.endDate);
  const participants = (b.participants ?? []) as NonNullable<BookingForSerialize['participants']>;
  const timeline = (b.timeline ?? []) as NonNullable<BookingForSerialize['timeline']>;
  const usageSnapshots = (b.usageSnapshots ?? []) as NonNullable<BookingForSerialize['usageSnapshots']>;
  const votes = (b.votes ?? []) as NonNullable<BookingForSerialize['votes']>;

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
      owner: (() => {
        const maybe = vote as unknown as {
          ownership?: { owner?: { id: number; firstName?: string; lastName?: string; email?: string } };
        };
        const o = maybe?.ownership?.owner ?? null;
        return o ? { id: o.id, firstName: o.firstName ?? null, lastName: o.lastName ?? null, email: o.email ?? null } : null;
      })(),
          ownership: (() => {
            const maybe = vote as unknown as { ownership?: { role?: string; votingPower?: number; shareBps?: number } };
            const ow = maybe?.ownership ?? null;
            return { role: ow?.role ?? null, votingPower: ow?.votingPower ?? null, shareBps: ow?.shareBps ?? null };
          })(),
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
            ownership: (() => {
              const maybe = participant.ownership as unknown as
                | { id: number; role: string; shareBps: number; votingPower: number; owner?: { id: number; email?: string; firstName?: string; lastName?: string } }
                | null
                | undefined;
              if (!maybe) return null;
              const o = maybe.owner ?? null;
              return {
                id: maybe.id,
                role: maybe.role,
                shareBps: maybe.shareBps,
                votingPower: maybe.votingPower,
                owner: o ? { id: o.id, email: o.email ?? null, firstName: o.firstName ?? null, lastName: o.lastName ?? null } : null,
              };
            })(),
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
              ownership: (() => {
                const maybe = event.actorOwnership as unknown as
                  | { id: number; role: string; shareBps: number; votingPower: number; owner?: { id: number; email?: string; firstName?: string; lastName?: string } }
                  | null
                  | undefined;
                if (!maybe) return null;
                const o = maybe.owner ?? null;
                return {
                  id: maybe.id,
                  role: maybe.role,
                  shareBps: maybe.shareBps,
                  votingPower: maybe.votingPower,
                  owner: o ? { id: o.id, email: o.email ?? null, firstName: o.firstName ?? null, lastName: o.lastName ?? null } : null,
                };
              })(),
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
