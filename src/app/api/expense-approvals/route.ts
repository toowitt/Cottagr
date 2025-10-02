import { NextRequest, NextResponse } from 'next/server';
import { ExpenseStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ExpenseApprovalSchema } from '@/lib/validation';
import { formatCents } from '@/lib/money';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExpenseApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const { expenseId, ownershipId, choice, rationale } = parsed.data;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        property: {
          include: { ownerships: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (expense.status !== ExpenseStatus.pending) {
      return NextResponse.json({ error: 'This expense is no longer open for approval' }, { status: 409 });
    }

    const ownership = expense.property.ownerships.find((share) => share.id === ownershipId);
    if (!ownership) {
      return NextResponse.json({ error: 'Ownership record does not belong to this property' }, { status: 400 });
    }

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
        ownership: true,
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
        createdByOwnership: { include: { owner: true } },
        approvals: {
          include: { ownership: { include: { owner: true } } },
          orderBy: { createdAt: 'asc' },
        },
        allocations: {
          include: { ownership: { include: { owner: true } } },
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
          id: vote.ownership.owner.id,
          firstName: vote.ownership.owner.firstName,
          lastName: vote.ownership.owner.lastName,
          email: vote.ownership.owner.email,
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
    console.error('POST /api/expense-approvals error:', error);
    return NextResponse.json({ error: 'Failed to record approval' }, { status: 500 });
  }
}
