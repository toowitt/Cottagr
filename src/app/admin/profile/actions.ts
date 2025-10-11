'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabaseActionClient } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/prisma';

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
  const supabase = await createServerSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin/profile');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/profile');
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
      owner: true,
    },
  });

  if (!ownership || !ownership.owner) {
    redirect('/admin/profile?error=Ownership%20not%20found');
  }

  if (ownership.owner.userId && ownership.owner.userId !== userRecord.id) {
    redirect('/admin/profile?error=You%20cannot%20update%20another%20owner');
  }

  if (!ownership.owner.userId) {
    await prisma.owner.update({
      where: { id: ownership.ownerId },
      data: { userId: userRecord.id },
    });
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
}
