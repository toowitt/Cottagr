
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';

export async function createBlackout(formData: FormData) {
  const propertyId = parseInt(formData.get('propertyId') as string);
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const reason = formData.get('reason') as string;

  if (!propertyId || !startDate || !endDate) {
    throw new Error('Missing required fields');
  }

  try {
    const membership = await ensureActionPropertyMembership(propertyId);
    const ownership = await prisma.ownership.findFirst({
      where: {
        propertyId,
        ownerProfileId: membership.ownerProfileId,
      },
      select: {
        blackoutManager: true,
      },
    });

    if (!ownership || !ownership.blackoutManager) {
      throw new ActionAuthError('Forbidden', 403);
    }

    await prisma.blackout.create({
      data: {
        propertyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || 'Blocked',
      },
    });

    revalidatePath('/admin/blackouts');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
    console.error('Error creating blackout:', error);
    throw new Error('Failed to create blackout');
  }
}

export async function deleteBlackout(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  if (!id) {
    throw new Error('Missing blackout ID');
  }

  try {
    const blackout = await prisma.blackout.findUnique({
      where: { id },
      select: {
        propertyId: true,
      },
    });

    if (!blackout) {
      throw new Error('Blackout not found');
    }

    const membership = await ensureActionPropertyMembership(blackout.propertyId);
    const ownership = await prisma.ownership.findFirst({
      where: {
        propertyId: blackout.propertyId,
        ownerProfileId: membership.ownerProfileId,
      },
      select: {
        blackoutManager: true,
      },
    });

    if (!ownership || !ownership.blackoutManager) {
      throw new ActionAuthError('Forbidden', 403);
    }

    await prisma.blackout.delete({
      where: { id },
    });

    revalidatePath('/admin/blackouts');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
    console.error('Error deleting blackout:', error);
    throw new Error('Failed to delete blackout');
  }
}
