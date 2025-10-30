'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getActionUserRecord, ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';

const updatePreferencesSchema = z.object({
  ownershipId: z.coerce.number().int().positive(),
  bookingApprover: z.boolean(),
  expenseApprover: z.boolean(),
  blackoutManager: z.boolean(),
  autoSkipBookings: z.boolean(),
  notifyOnBookings: z.boolean(),
  notifyOnExpenses: z.boolean(),
});

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true';
}

export async function updateOwnershipPreferences(formData: FormData) {
  let userRecord;
  try {
    userRecord = await getActionUserRecord();
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect('/login?redirect=/admin/profile');
    }
    throw error;
  }

  const parsed = updatePreferencesSchema.safeParse({
    ownershipId: formData.get('ownershipId'),
    bookingApprover: parseCheckbox(formData.get('bookingApprover')),
    expenseApprover: parseCheckbox(formData.get('expenseApprover')),
    blackoutManager: parseCheckbox(formData.get('blackoutManager')),
    autoSkipBookings: parseCheckbox(formData.get('autoSkipBookings')),
    notifyOnBookings: parseCheckbox(formData.get('notifyOnBookings')),
    notifyOnExpenses: parseCheckbox(formData.get('notifyOnExpenses')),
  });

  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid preferences';
    redirect(`/admin/profile?error=${encodeURIComponent(msg)}`);
  }

  const ownership = await prisma.ownership.findUnique({
    where: { id: parsed.data.ownershipId },
    include: {
      ownerProfile: true,
      property: {
        select: { id: true },
      },
    },
  });

  if (!ownership || !ownership.ownerProfile || !ownership.property) {
    redirect('/admin/profile?error=Ownership%20not%20found');
  }

  try {
    const membership = await ensureActionPropertyMembership(ownership.property.id);
    if (membership.ownerProfileId !== ownership.ownerProfileId) {
      redirect('/admin/profile?error=You%20cannot%20update%20another%20owner');
    }

    if (!ownership.ownerProfile.userId) {
      await prisma.ownerProfile.update({
        where: { id: ownership.ownerProfileId },
        data: { userId: userRecord.id },
      });
    } else if (ownership.ownerProfile.userId !== userRecord.id) {
      redirect('/admin/profile?error=You%20cannot%20update%20another%20owner');
    }

    await prisma.ownership.update({
      where: { id: ownership.id },
      data: {
        bookingApprover: parsed.data.bookingApprover,
        expenseApprover: parsed.data.expenseApprover,
        blackoutManager: parsed.data.blackoutManager,
        autoSkipBookings: parsed.data.autoSkipBookings,
        notifyOnBookings: parsed.data.notifyOnBookings,
        notifyOnExpenses: parsed.data.notifyOnExpenses,
      },
    });

    revalidatePath('/admin/profile');
    redirect('/admin/profile?success=preferences-saved');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect('/admin/profile?error=' + encodeURIComponent(error.message));
    }
    throw error;
  }
}
