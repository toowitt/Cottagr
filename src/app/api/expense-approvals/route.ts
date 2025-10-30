import { NextRequest, NextResponse } from 'next/server';
import { ExpenseStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ExpenseApprovalSchema } from '@/lib/validation';
import { formatCents } from '@/lib/money';
import { getRouteUserRecord, assertPropertyAccess, RouteAuthError } from '@/lib/auth/routeAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExpenseApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const { expenseId, ownershipId: requestedOwnershipId, choice, rationale } = parsed.data;

    const userRecord = await getRouteUserRecord();

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
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

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const membership = assertPropertyAccess(userRecord, expense.propertyId);

    if (expense.status !== ExpenseStatus.pending) {
      return NextResponse.json({ error: 'This expense is no longer open for approval' }, { status: 409 });
    }

    const ownership = expense.property.ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);
    if (!ownership) {
      return NextResponse.json({ error: 'You are not linked to an ownership share for this property' }, { status: 403 });
    }

    if (!ownership.expenseApprover) {
      return NextResponse.json({ error: 'This owner cannot approve expenses' }, { status: 403 });
    }

    if (requestedOwnershipId && requestedOwnershipId !== ownership.id) {
      return NextResponse.json({ error: 'Mismatched ownership' }, { status: 400 });
    }

    const ownershipId = ownership.id;

    await prisma.expenseApproval.upsert({
      where: {
        expenseId_ownershipId: {
          expenseId,
          ownershipId,
        },
      },
      update: {
        choice,
        rationale: rationale?.trim() || null,
      },
      create: {
        expenseId,
        ownershipId,
        choice,
        rationale: rationale?.trim() || null,
      },
    });

    const approvals = await prisma.expenseApproval.findMany({
      where: { expenseId },
      include: {
        ownership: {
          include: { ownerProfile: true },
        },
      },
    });

    const totalVotingPower = expense.property.ownerships.reduce((sum, record) => sum + record.votingPower, 0);
    const approvalsPower = approvals
      .filter((vote) => vote.choice === 'approve')
      .reduce((sum, vote) => sum + vote.ownership.votingPower, 0);
    const rejectionsPower = approvals
      .filter((vote) => vote.choice === 'reject')
      .reduce((sum, vote) => sum + vote.ownership.votingPower, 0);

    const threshold = Math.floor(totalVotingPower / 2) + 1;
    let newStatus: ExpenseStatus | null = null;
    let decisionSummary: string | null = null;

    if (approvalsPower >= threshold) {
      newStatus = ExpenseStatus.approved;
      decisionSummary = `Approved with ${approvalsPower}/${totalVotingPower} voting power`;
    } else if (rejectionsPower >= threshold) {
      newStatus = ExpenseStatus.rejected;
      decisionSummary = `Rejected with ${rejectionsPower}/${totalVotingPower} voting power`;
    }

    if (newStatus) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: {
          status: newStatus,
          decisionSummary,
        },
      });
    }

    const refreshed = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        createdByOwnership: { include: { ownerProfile: true } },
        approvals: {
          include: { ownership: { include: { ownerProfile: true } } },
          orderBy: { createdAt: 'asc' },
        },
        allocations: {
          include: { ownership: { include: { ownerProfile: true } } },
        },
      },
    });

    if (!refreshed) {
      return NextResponse.json({ error: 'Expense not found after vote' }, { status: 500 });
    }

    const responsePayload = {
      id: refreshed.id,
      status: refreshed.status,
      decisionSummary: refreshed.decisionSummary,
      amountCents: refreshed.amountCents,
      amountFormatted: formatCents(refreshed.amountCents),
      approvals: refreshed.approvals.map((vote) => ({
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
    console.error('POST /api/expense-approvals error:', error);
    return NextResponse.json({ error: 'Failed to record approval' }, { status: 500 });
  }
}
