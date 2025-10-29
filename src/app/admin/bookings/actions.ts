
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
    await prisma.$transaction([
      prisma.bookingVote.deleteMany({ where: { bookingId: id } }),
      prisma.bookingParticipant.deleteMany({ where: { bookingId: id } }),
      prisma.bookingTimelineEvent.deleteMany({ where: { bookingId: id } }),
      prisma.bookingUsageSnapshot.deleteMany({ where: { bookingId: id } }),
      prisma.booking.delete({ where: { id } }),
    ]);

    revalidatePath('/admin/bookings');
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw new Error('Failed to delete booking');
  }
}

export async function createQuickBooking(formData: FormData) {
  const propertyId = parseInt(formData.get('propertyId') as string);
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const guestName = formData.get('guestName') as string;

  if (!propertyId || !startDate || !endDate) {
    throw new Error('Missing required fields');
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new Error('End date must be after start date');
    }

    // Get property for pricing
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        nightlyRate: true,
        cleaningFee: true,
        minNights: true
      }
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Calculate nights and total
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = nights * property.nightlyRate + property.cleaningFee;

    await prisma.booking.create({
      data: {
        propertyId,
        startDate: start,
        endDate: end,
        guestName: guestName || 'Manual Entry',
        guestEmail: null,
        totalAmount,
        status: BookingStatus.approved, // Manual bookings are approved by default
      },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    console.error('Error creating quick booking:', error);
    throw new Error('Failed to create booking');
  }
}

export async function createQuickBlackout(formData: FormData) {
  const propertyId = parseInt(formData.get('propertyId') as string);
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const reason = formData.get('reason') as string;

  if (!propertyId || !startDate || !endDate) {
    throw new Error('Missing required fields');
  }

  try {
    await prisma.blackout.create({
      data: {
        propertyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || 'Manual Block',
      },
    });

    revalidatePath('/admin/bookings');
    revalidatePath('/admin/blackouts');
  } catch (error) {
    console.error('Error creating quick blackout:', error);
    throw new Error('Failed to create blackout');
  }
}
