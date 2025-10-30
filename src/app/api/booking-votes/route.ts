import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BookingVoteSchema } from '@/lib/validation';
import { formatCents } from '@/lib/money';
import { getRouteUserRecord, assertPropertyAccess, RouteAuthError } from '@/lib/auth/routeAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BookingVoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { bookingId, ownershipId: requestedOwnershipId, choice, rationale } = parsed.data;

    const userRecord = await getRouteUserRecord();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: {
            ownerships: {
              include: { ownerProfile: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const membership = assertPropertyAccess(userRecord, booking.propertyId);

    if (booking.status !== BookingStatus.pending) {
      return NextResponse.json(
        { error: 'This booking is no longer open for voting' },
        { status: 409 }
      );
    }

    const ownershipFromMembership = booking.property.ownerships.find(
      (record) => record.ownerProfileId === membership.ownerProfileId,
    );

    if (!ownershipFromMembership) {
      return NextResponse.json(
        { error: 'You are not linked to an ownership share for this property' },
        { status: 403 }
      );
    }

    const ownership = ownershipFromMembership;
    const ownershipId = ownership.id;

    if (requestedOwnershipId && requestedOwnershipId !== ownership.id) {
      return NextResponse.json(
        { error: 'Mismatched ownership' },
        { status: 400 }
      );
    }

    if (!ownership) {
      return NextResponse.json(
        { error: 'Ownership record does not belong to this property' },
        { status: 400 }
      );
    }

    await prisma.bookingVote.upsert({
      where: {
        bookingId_ownershipId: {
          bookingId,
          ownershipId,
        },
      },
      update: {
        choice,
        rationale: rationale ?? null,
      },
      create: {
        bookingId,
        ownershipId,
        choice,
        rationale: rationale ?? null,
      },
    });

    const votes = await prisma.bookingVote.findMany({
      where: { bookingId },
      include: {
        ownership: {
          include: { ownerProfile: true },
        },
      },
    });

    const totalVotingPower = booking.property.ownerships.reduce(
      (sum, record) => sum + record.votingPower,
      0
    );

    const approvalsPower = votes
      .filter((vote) => vote.choice === 'approve')
      .reduce((sum, vote) => sum + vote.ownership.votingPower, 0);

    const rejectionsPower = votes
      .filter((vote) => vote.choice === 'reject')
      .reduce((sum, vote) => sum + vote.ownership.votingPower, 0);

    const threshold = Math.floor(totalVotingPower / 2) + 1;
    let newStatus: BookingStatus | null = null;
    let decisionSummary: string | null = null;

    if (approvalsPower >= threshold) {
      newStatus = BookingStatus.approved;
      decisionSummary = `Approved with ${approvalsPower}/${totalVotingPower} voting power`;
    } else if (rejectionsPower >= threshold) {
      newStatus = BookingStatus.rejected;
      decisionSummary = `Rejected with ${rejectionsPower}/${totalVotingPower} voting power`;
    }

    if (newStatus) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          decisionSummary,
        },
      });
    }

    const refreshed = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        createdByOwnership: {
          include: { ownerProfile: true },
        },
        votes: {
          include: {
            ownership: {
              include: { ownerProfile: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!refreshed) {
      return NextResponse.json({ error: 'Booking not found after vote' }, { status: 500 });
    }

    const responsePayload = {
      id: refreshed.id,
      status: refreshed.status,
      decisionSummary: refreshed.decisionSummary,
      totalAmount: refreshed.totalAmount,
      totalFormatted: formatCents(refreshed.totalAmount),
      votes: refreshed.votes.map((vote) => ({
        id: vote.id,
        choice: vote.choice,
        rationale: vote.rationale,
        createdAt: vote.createdAt.toISOString(),
        ownershipId: vote.ownershipId,
        owner: {
          id: vote.ownership.ownerProfile.id,
          firstName: vote.ownership.ownerProfile.firstName,
          lastName: vote.ownership.ownerProfile.lastName,
          email: vote.ownership.ownerProfile.email,
        },
        ownership: {
          role: vote.ownership.role,
          votingPower: vote.ownership.votingPower,
          shareBps: vote.ownership.shareBps,
        },
      })),
      tallies: {
        approvalsPower,
        rejectionsPower,
        totalVotingPower,
        threshold,
      },
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    if (error instanceof RouteAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/booking-votes error:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
