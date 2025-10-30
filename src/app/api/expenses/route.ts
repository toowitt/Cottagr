import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ExpenseCreateSchema, ExpenseUpdateSchema, BookingListQuerySchema } from '@/lib/validation';
import { formatCents } from '@/lib/money';
import { getRouteUserRecord, assertPropertyAccess, getAccessiblePropertyIds, RouteAuthError } from '@/lib/auth/routeAuth';

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

    const userRecord = await getRouteUserRecord();
    const accessiblePropertyIds = getAccessiblePropertyIds(userRecord);

    if (propertyId) {
      if (!accessiblePropertyIds.has(propertyId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (accessiblePropertyIds.size === 0) {
      return NextResponse.json({ expenses: [] }, { status: 200 });
    }

    const expenses = await prisma.expense.findMany({
      where: propertyId ? { propertyId } : { propertyId: { in: Array.from(accessiblePropertyIds) } },
      include: {
        createdByOwnership: { include: { ownerProfile: true } },
        paidByOwnership: { include: { ownerProfile: true } },
        approvals: {
          include: { ownership: { include: { ownerProfile: true } } },
          orderBy: { createdAt: 'asc' },
        },
        allocations: {
          include: { ownership: { include: { ownerProfile: true } } },
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
            ownerProfile: expense.createdByOwnership.ownerProfile
              ? {
                  id: expense.createdByOwnership.ownerProfile.id,
                  firstName: expense.createdByOwnership.ownerProfile.firstName,
                  lastName: expense.createdByOwnership.ownerProfile.lastName,
                  email: expense.createdByOwnership.ownerProfile.email,
                }
              : null,
          }
        : null,
      paidByOwnershipId: expense.paidByOwnershipId,
      paidBy: expense.paidByOwnership
        ? {
            ownershipId: expense.paidByOwnership.id,
            ownerProfile: expense.paidByOwnership.ownerProfile
              ? {
                  id: expense.paidByOwnership.ownerProfile.id,
                  firstName: expense.paidByOwnership.ownerProfile.firstName,
                  lastName: expense.paidByOwnership.ownerProfile.lastName,
                  email: expense.paidByOwnership.ownerProfile.email,
                }
              : null,
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
        ownerProfile: {
          id: approval.ownership.ownerProfile.id,
          firstName: approval.ownership.ownerProfile.firstName,
          lastName: approval.ownership.ownerProfile.lastName,
          email: approval.ownership.ownerProfile.email,
        },
      })),
      allocations: expense.allocations.map((allocation) => ({
        id: allocation.id,
        amountCents: allocation.amountCents,
        amountFormatted: formatCents(allocation.amountCents),
        ownershipId: allocation.ownershipId,
        ownerProfile: {
          id: allocation.ownership.ownerProfile.id,
          firstName: allocation.ownership.ownerProfile.firstName,
          lastName: allocation.ownership.ownerProfile.lastName,
          email: allocation.ownership.ownerProfile.email,
        },
      })),
    }));

    return NextResponse.json({ expenses: payload });
  } catch (error) {
    if (error instanceof RouteAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
      paidByOwnershipId,
      vendorName,
      category,
      memo,
      amountCents,
      incurredOn,
      receiptUrl,
    } = parsed.data;

    const userRecord = await getRouteUserRecord();
    const membership = assertPropertyAccess(userRecord, propertyId);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { ownerships: true },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const requestingOwnership = property.ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);
    if (!requestingOwnership) {
      return NextResponse.json({ error: 'You are not linked to an ownership share for this property' }, { status: 403 });
    }

    if (!requestingOwnership.expenseApprover) {
      return NextResponse.json({ error: 'This owner cannot log expenses' }, { status: 403 });
    }

    const createdByOwnershipId = requestingOwnership.id;

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
    if (error instanceof RouteAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExpenseUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }

    const {
      expenseId,
      propertyId,
      paidByOwnershipId,
      vendorName,
      category,
      memo,
      amountCents,
      incurredOn,
      receiptUrl,
    } = parsed.data;

    const userRecord = await getRouteUserRecord();

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        property: { include: { ownerships: true } },
      },
    });

    if (!expense || expense.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const membership = assertPropertyAccess(userRecord, expense.propertyId);

    const ownerships = expense.property.ownerships;
    const ownershipIds = new Set(ownerships.map((share) => share.id));

    const actorOwnership = ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);
    if (!actorOwnership) {
      return NextResponse.json({ error: 'You are not linked to an ownership share for this property' }, { status: 403 });
    }

    if (!actorOwnership.expenseApprover) {
      return NextResponse.json({ error: 'This owner cannot manage expenses' }, { status: 403 });
    }

    const createdByOwnershipId = actorOwnership.id;

    if (paidByOwnershipId && !ownershipIds.has(paidByOwnershipId)) {
      return NextResponse.json({ error: 'Payer must be an owner of this property' }, { status: 400 });
    }

    const allocations = splitAmount(
      amountCents,
      ownerships.map((share) => ({ id: share.id, shareBps: share.shareBps }))
    );

    await prisma.$transaction(async (tx) => {
      await tx.expenseAllocation.deleteMany({ where: { expenseId } });
      await tx.expenseApproval.deleteMany({ where: { expenseId } });
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          createdByOwnershipId,
          paidByOwnershipId,
          vendorName: vendorName?.trim() || null,
          category: category?.trim() || null,
          memo: memo?.trim() || null,
          amountCents,
          incurredOn: new Date(`${incurredOn}T00:00:00Z`),
          receiptUrl: receiptUrl?.trim() || null,
          status: 'pending',
          decisionSummary: null,
        },
      });

      if (allocations.length > 0) {
        await tx.expenseAllocation.createMany({
          data: allocations.map((allocation) => ({
            expenseId,
            ownershipId: allocation.ownershipId,
            amountCents: allocation.amountCents,
          })),
        });
      }
    });

    return NextResponse.json({ id: expenseId, amountFormatted: formatCents(amountCents) });
  } catch (error) {
    if (error instanceof RouteAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}
