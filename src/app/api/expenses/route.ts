import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ExpenseCreateSchema, BookingListQuerySchema } from '@/lib/validation';
import { formatCents } from '@/lib/money';

const splitAmount = (amountCents: number, shares: Array<{ id: number; shareBps: number }>) => {
  let remainder = amountCents;
  return shares.map((share, index) => {
    let portion = Math.round((amountCents * share.shareBps) / 10000);
    if (index === shares.length - 1) {
      portion = remainder;
    }
    remainder -= portion;
    return { ownershipId: share.id, amountCents: portion };
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = BookingListQuerySchema.safeParse({
      propertyId: searchParams.get('propertyId') ? Number(searchParams.get('propertyId')) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
    }

    const { propertyId } = parsed.data;

    const expenses = await prisma.expense.findMany({
      where: { propertyId },
      include: {
        createdByOwnership: { include: { owner: true } },
        paidByOwnership: { include: { owner: true } },
        approvals: {
          include: { ownership: { include: { owner: true } } },
          orderBy: { createdAt: 'asc' },
        },
        allocations: {
          include: { ownership: { include: { owner: true } } },
        },
      },
      orderBy: [{ incurredOn: 'desc' }, { createdAt: 'desc' }],
    });

    const payload = expenses.map((expense) => ({
      id: expense.id,
      propertyId: expense.propertyId,
      createdByOwnershipId: expense.createdByOwnershipId,
      createdBy: expense.createdByOwnership
        ? {
            ownershipId: expense.createdByOwnership.id,
            owner: {
              id: expense.createdByOwnership.owner.id,
              firstName: expense.createdByOwnership.owner.firstName,
              lastName: expense.createdByOwnership.owner.lastName,
              email: expense.createdByOwnership.owner.email,
            },
          }
        : null,
      paidByOwnershipId: expense.paidByOwnershipId,
      paidBy: expense.paidByOwnership
        ? {
            ownershipId: expense.paidByOwnership.id,
            owner: {
              id: expense.paidByOwnership.owner.id,
              firstName: expense.paidByOwnership.owner.firstName,
              lastName: expense.paidByOwnership.owner.lastName,
              email: expense.paidByOwnership.owner.email,
            },
          }
        : null,
      vendorName: expense.vendorName,
      category: expense.category,
      memo: expense.memo,
      amountCents: expense.amountCents,
      amountFormatted: formatCents(expense.amountCents),
      incurredOn: expense.incurredOn.toISOString().split('T')[0],
      status: expense.status,
      decisionSummary: expense.decisionSummary,
      receiptUrl: expense.receiptUrl,
      createdAt: expense.createdAt.toISOString(),
      approvals: expense.approvals.map((approval) => ({
        id: approval.id,
        choice: approval.choice,
        rationale: approval.rationale,
        createdAt: approval.createdAt.toISOString(),
        ownershipId: approval.ownershipId,
        owner: {
          id: approval.ownership.owner.id,
          firstName: approval.ownership.owner.firstName,
          lastName: approval.ownership.owner.lastName,
          email: approval.ownership.owner.email,
        },
      })),
      allocations: expense.allocations.map((allocation) => ({
        id: allocation.id,
        amountCents: allocation.amountCents,
        amountFormatted: formatCents(allocation.amountCents),
        ownershipId: allocation.ownershipId,
        owner: {
          id: allocation.ownership.owner.id,
          firstName: allocation.ownership.owner.firstName,
          lastName: allocation.ownership.owner.lastName,
          email: allocation.ownership.owner.email,
        },
      })),
    }));

    return NextResponse.json({ expenses: payload });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExpenseCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const {
      propertyId,
      createdByOwnershipId,
      paidByOwnershipId,
      vendorName,
      category,
      memo,
      amountCents,
      incurredOn,
      receiptUrl,
    } = parsed.data;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { ownerships: true },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const requestingOwnership = property.ownerships.find((share) => share.id === createdByOwnershipId);
    if (!requestingOwnership) {
      return NextResponse.json({ error: 'Ownership record not found for property' }, { status: 400 });
    }

    if (paidByOwnershipId) {
      const payerOwnership = property.ownerships.find((share) => share.id === paidByOwnershipId);
      if (!payerOwnership) {
        return NextResponse.json({ error: 'Payer must be an owner of this property' }, { status: 400 });
      }
    }

    const allocations = splitAmount(
      amountCents,
      property.ownerships.map((share) => ({ id: share.id, shareBps: share.shareBps }))
    );

    const createData: Prisma.ExpenseUncheckedCreateInput = {
      propertyId,
      createdByOwnershipId,
      paidByOwnershipId,
      vendorName: vendorName?.trim() || null,
      category: category?.trim() || null,
      memo: memo?.trim() || null,
      amountCents,
      incurredOn: new Date(`${incurredOn}T00:00:00Z`),
      status: 'pending', // default pending status
      receiptUrl: receiptUrl?.trim() || null,
    };

    if (allocations.length > 0) {
      createData.allocations = { create: allocations };
    }
    const expense = await prisma.expense.create({
      data: createData,
    });

    return NextResponse.json(
      {
        id: expense.id,
        status: expense.status,
        amountCents: expense.amountCents,
        amountFormatted: formatCents(expense.amountCents),
        paidByOwnershipId: expense.paidByOwnershipId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
