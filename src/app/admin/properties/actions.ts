
'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const PropertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  location: z.string().optional(),
  beds: z.coerce.number().min(0).optional(),
  baths: z.coerce.number().min(0).optional(),
  nightlyRate: z.coerce.number().min(0, 'Nightly rate must be positive'),
  cleaningFee: z.coerce.number().min(0, 'Cleaning fee must be positive'),
  minNights: z.coerce.number().min(1, 'Minimum nights must be at least 1'),
  description: z.string().optional(),
  photos: z.string().optional(),
});

export async function createProperty(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = PropertySchema.parse(rawData);
    
    // Parse photos from comma-separated string
    const photos = validatedData.photos
      ? validatedData.photos.split(',').map(url => url.trim()).filter(Boolean)
      : [];

    await prisma.property.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        location: validatedData.location || null,
        beds: validatedData.beds || null,
        baths: validatedData.baths || null,
        nightlyRate: validatedData.nightlyRate,
        cleaningFee: validatedData.cleaningFee,
        minNights: validatedData.minNights,
        description: validatedData.description || null,
        photos: photos.length > 0 ? photos : null,
      },
    });

    redirect('/admin/properties?success=created');
  } catch (error) {
    console.error('Error creating property:', error);
    redirect('/admin/properties?error=create_failed');
  }
}

export async function updateProperty(id: number, formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = PropertySchema.parse(rawData);
    
    // Parse photos from comma-separated string
    const photos = validatedData.photos
      ? validatedData.photos.split(',').map(url => url.trim()).filter(Boolean)
      : [];

    await prisma.property.update({
      where: { id },
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        location: validatedData.location || null,
        beds: validatedData.beds || null,
        baths: validatedData.baths || null,
        nightlyRate: validatedData.nightlyRate,
        cleaningFee: validatedData.cleaningFee,
        minNights: validatedData.minNights,
        description: validatedData.description || null,
        photos: photos.length > 0 ? photos : null,
      },
    });

    redirect('/admin/properties?success=updated');
  } catch (error) {
    console.error('Error updating property:', error);
    redirect('/admin/properties?error=update_failed');
  }
}

export async function deleteProperty(id: number) {
  try {
    await prisma.property.delete({
      where: { id },
    });

    redirect('/admin/properties?success=deleted');
  } catch (error) {
    console.error('Error deleting property:', error);
    redirect('/admin/properties?error=delete_failed');
  }
}
