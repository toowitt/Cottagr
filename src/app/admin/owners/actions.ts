'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const assignExistingOwnerSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  ownerId: z.coerce.number().int().positive(),
  shareBps: z.coerce.number().int().min(0).max(10_000),
  votingPower: z.coerce.number().int().min(0),
});

const createOwnerAndAssignSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Valid email required'),
  shareBps: z.coerce.number().int().min(0).max(10_000),
  votingPower: z.coerce.number().int().min(0),
});

function buildRedirect(path: string, search: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function ensureShareCapacity(propertyId: number, additionalShare: number) {
  const totalShare = await prisma.ownership.aggregate({
    where: { propertyId },
    _sum: { shareBps: true },
  });

  const currentShare = totalShare._sum.shareBps ?? 0;
  if (currentShare + additionalShare > 10_000) {
    return false;
  }

  return true;
}

export async function assignExistingOwner(formData: FormData) {
  const parsed = assignExistingOwnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(
      buildRedirect('/admin/owners', {
        error: msg,
        propertyId: formData.get('propertyId')?.toString(),
      }),
    );
  }

  const { propertyId, ownerId, shareBps, votingPower } = parsed.data;

  const hasCapacity = await ensureShareCapacity(propertyId, shareBps);
  if (!hasCapacity) {
    redirect(
      buildRedirect('/admin/owners', {
        error: 'Adding this share exceeds 100%',
        propertyId,
      }),
    );
  }

  try {
    await prisma.ownership.create({
      data: {
        propertyId,
        ownerId,
        shareBps,
        votingPower,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('Unique constraint failed')
        ? 'That owner is already assigned to this property.'
        : 'Could not assign owner. Please try again.';

    redirect(
      buildRedirect('/admin/owners', {
        error: message,
        propertyId,
      }),
    );
  }

  revalidatePath('/admin/owners');
  redirect(
    buildRedirect('/admin/owners', {
      success: 'assigned',
      propertyId,
    }),
  );
}

export async function createOwnerAndAssign(formData: FormData) {
  const parsed = createOwnerAndAssignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(
      buildRedirect('/admin/owners', {
        error: msg,
        propertyId: formData.get('propertyId')?.toString(),
      }),
    );
  }

  const { propertyId, firstName, lastName, email, shareBps, votingPower } = parsed.data;

  const hasCapacity = await ensureShareCapacity(propertyId, shareBps);
  if (!hasCapacity) {
    redirect(
      buildRedirect('/admin/owners', {
        error: 'Adding this share exceeds 100%',
        propertyId,
      }),
    );
  }

  const normalizedLastName = lastName?.trim() || null;

  const existingOwner = await prisma.owner.findUnique({ where: { email } });
  const owner = existingOwner
    ? await prisma.owner.update({
        where: { id: existingOwner.id },
        data: {
          firstName,
          lastName: normalizedLastName,
        },
      })
    : await prisma.owner.create({
        data: {
          email,
          firstName,
          lastName: normalizedLastName,
        },
      });

  try {
    await prisma.ownership.create({
      data: {
        propertyId,
        ownerId: owner.id,
        shareBps,
        votingPower,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('Unique constraint failed')
        ? 'That owner is already assigned to this property.'
        : 'Could not assign owner. Please try again.';

    redirect(
      buildRedirect('/admin/owners', {
        error: message,
        propertyId,
      }),
    );
  }

  revalidatePath('/admin/owners');
  redirect(
    buildRedirect('/admin/owners', {
      success: 'created',
      propertyId,
    }),
  );
}

export async function deleteOwnership(formData: FormData) {
  const id = Number(formData.get('id'));
  const propertyId = Number(formData.get('propertyId')) || undefined;

  if (!id) {
    redirect(
      buildRedirect('/admin/owners', {
        error: 'Missing ownership id',
        propertyId,
      }),
    );
  }

  await prisma.ownership.delete({ where: { id } });
  revalidatePath('/admin/owners');
  redirect(
    buildRedirect('/admin/owners', {
      success: 'deleted',
      propertyId,
    }),
  );
}
