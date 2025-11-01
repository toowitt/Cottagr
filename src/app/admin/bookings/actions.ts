
'use server';

import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';

export async function confirmBooking(formData: FormData) {
  const id = parseInt(formData.get('id') as string);

  if (!id) {
    throw new Error('Missing booking ID');
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        propertyId: true,
        property: {
          select: {
            ownerships: {
              select: {
                id: true,
                ownerProfileId: true,
                bookingApprover: true,
              },
            },
          },
        },
      },
    });

    if (!booking || !booking.property) {
      throw new Error('Booking not found');
    }

    const membership = await ensureActionPropertyMembership(booking.propertyId);
    const ownership = booking.property.ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);

    if (!ownership || !ownership.bookingApprover) {
      throw new ActionAuthError('Forbidden', 403);
    }

    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.approved, createdByOwnershipId: ownership.id },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
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
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        propertyId: true,
        property: {
          select: {
            ownerships: {
              select: {
                id: true,
                ownerProfileId: true,
                bookingApprover: true,
              },
            },
          },
        },
      },
    });

    if (!booking || !booking.property) {
      throw new Error('Booking not found');
    }

    const membership = await ensureActionPropertyMembership(booking.propertyId);
    const ownership = booking.property.ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);

    if (!ownership || !ownership.bookingApprover) {
      throw new ActionAuthError('Forbidden', 403);
    }

    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.cancelled },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
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
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        propertyId: true,
        property: {
          select: {
            ownerships: {
              select: {
                id: true,
                ownerProfileId: true,
                bookingApprover: true,
              },
            },
          },
        },
      },
    });

    if (!booking || !booking.property) {
      throw new Error('Booking not found');
    }

    const membership = await ensureActionPropertyMembership(booking.propertyId);
    const ownership = booking.property.ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);

    if (!ownership || !ownership.bookingApprover) {
      throw new ActionAuthError('Forbidden', 403);
    }

    await prisma.booking.delete({
      where: { id },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
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
        minNights: true,
        ownerships: {
          select: {
            id: true,
            ownerProfileId: true,
            bookingApprover: true,
          },
        },
      }
    });

    if (!property) {
      throw new Error('Property not found');
    }

    const membership = await ensureActionPropertyMembership(propertyId);
    const ownership = property.ownerships.find((share) => share.ownerProfileId === membership.ownerProfileId);

    if (!ownership || !ownership.bookingApprover) {
      throw new ActionAuthError('Forbidden', 403);
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
        createdByOwnershipId: ownership.id,
      },
    });

    revalidatePath('/admin/bookings');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
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
        reason: reason || 'Manual Block',
      },
    });

    revalidatePath('/admin/bookings');
    revalidatePath('/admin/blackouts');
  } catch (error) {
    if (error instanceof ActionAuthError) {
      throw error;
    }
    console.error('Error creating quick blackout:', error);
    throw new Error('Failed to create blackout');
  }
}
