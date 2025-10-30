
'use server';

import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function confirmBooking(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  if (!id) {
    throw new Error('Missing booking ID');
  }

  try {
    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.approved },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    console.error('Error confirming booking:', error);
    throw new Error('Failed to confirm booking');
  }
}

export async function cancelBooking(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  if (!id) {
    throw new Error('Missing booking ID');
  }

  try {
    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.cancelled },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw new Error('Failed to cancel booking');
  }
}

export async function deleteBooking(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  if (!id) {
    throw new Error('Missing booking ID');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bookingVote.deleteMany({ where: { bookingId: id } });
      await tx.bookingParticipant.deleteMany({ where: { bookingId: id } });
      await tx.bookingTimelineEvent.deleteMany({ where: { bookingId: id } });
      await tx.bookingUsageSnapshot.deleteMany({ where: { bookingId: id } });
      await tx.booking.delete({ where: { id } });
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw new Error('Failed to delete booking');
  }
}
