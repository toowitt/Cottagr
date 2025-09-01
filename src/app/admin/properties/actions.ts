'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Accepts the "photos" form field (comma-separated URLs) and returns
 * a Prisma-compatible JSON value. We NEVER pass `null` for JSON fields.
 * - On create with empty input: returns [].
 * - On update with empty input: returns `undefined` (no change).
 */
function parsePhotosToJson(
  val: FormDataEntryValue | null,
  opts?: { forCreate?: boolean }
): Prisma.InputJsonValue | undefined {
  const s = (val?.toString() ?? '').trim();
  if (!s) {
    return opts?.forCreate ? ([] as unknown as Prisma.InputJsonValue) : undefined;
  }
  const arr = s.split(',').map(x => x.trim()).filter(Boolean);
  return arr as unknown as Prisma.InputJsonValue;
}

// Form validation (keeps your admin UI constraints)
const PropertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  location: z.string().optional(),
  beds: z.coerce.number().int().min(0).optional(),
  baths: z.coerce.number().int().min(0).optional(),
  nightlyRate: z.coerce.number().int().min(0, 'Nightly rate must be positive'),
  cleaningFee: z.coerce.number().int().min(0, 'Cleaning fee must be positive'),
  minNights: z.coerce.number().int().min(1, 'Minimum nights must be at least 1'),
  description: z.string().optional(),
  photos: z.string().optional(), // comma-separated URLs
});

export async function createProperty(formData: FormData) {
  try {
    const raw = Object.fromEntries(formData);
    const validated = PropertySchema.parse(raw);

    const photos = parsePhotosToJson(formData.get('photos'), { forCreate: true });

    await prisma.property.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        location: validated.location || null,
        beds: typeof validated.beds === 'number' ? validated.beds : null,
        baths: typeof validated.baths === 'number' ? validated.baths : null,
        description: validated.description || null,
        nightlyRate: validated.nightlyRate,
        cleaningFee: validated.cleaningFee,
        minNights: validated.minNights,
        photos, // ✅ JSON array (never null)
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
    const raw = Object.fromEntries(formData);
    const validated = PropertySchema.parse(raw);

    // undefined => do not touch the field; non-empty => set JSON array
    const photosU = parsePhotosToJson(formData.get('photos'));

    await prisma.property.update({
      where: { id },
      data: {
        name: validated.name,
        slug: validated.slug,
        location: validated.location || null,
        beds: typeof validated.beds === 'number' ? validated.beds : null,
        baths: typeof validated.baths === 'number' ? validated.baths : null,
        description: validated.description || null,
        nightlyRate: validated.nightlyRate,
        cleaningFee: validated.cleaningFee,
        minNights: validated.minNights,
        ...(photosU !== undefined ? { photos: photosU } : {}), // ✅ no nulls
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
    await prisma.property.delete({ where: { id } });
    redirect('/admin/properties?success=deleted');
  } catch (error) {
    console.error('Error deleting property:', error);
    redirect('/admin/properties?error=delete_failed');
  }
}
