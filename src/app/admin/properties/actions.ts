'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/** Turn the comma-separated photos input into a Prisma JSON value */
function parsePhotosToJson(
  val: FormDataEntryValue | null,
  opts?: { forCreate?: boolean }
): Prisma.InputJsonValue | undefined {
  const s = (val?.toString() ?? '').trim();
  if (!s) {
    // On create: store empty JSON array; on update: leave unchanged
    return opts?.forCreate ? ([] as unknown as Prisma.InputJsonValue) : undefined;
  }
  const arr = s.split(',').map(x => x.trim()).filter(Boolean);
  return arr as unknown as Prisma.InputJsonValue;
}

/** Helper: treat blank strings as undefined so optional fields don’t fail */
const blankToUndef = (v: unknown) =>
  v === '' || v === null ? undefined : v;

/** Validation schema (preprocess to handle blank optional numbers) */
const PropertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  location: z.preprocess(blankToUndef, z.string().min(1).optional()),
  beds: z.preprocess(blankToUndef, z.coerce.number().int().min(0)).optional(),
  baths: z.preprocess(blankToUndef, z.coerce.number().int().min(0)).optional(),
  nightlyRate: z.preprocess(
    blankToUndef,
    z.coerce.number().int().min(0, 'Nightly rate must be a non-negative integer (in cents)')
  ),
  cleaningFee: z.preprocess(
    blankToUndef,
    z.coerce.number().int().min(0, 'Cleaning fee must be a non-negative integer (in cents)')
  ),
  minNights: z.preprocess(
    blankToUndef,
    z.coerce.number().int().min(1, 'Minimum nights must be at least 1')
  ),
  description: z.preprocess(blankToUndef, z.string().optional()),
  photos: z.string().optional(), // comma-separated URLs
});

export async function createProperty(formData: FormData) {
  // Use safeParse so a validation failure doesn’t throw a server exception
  const parsed = PropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    // Navigate back with an error message (no uncaught exception)
    redirect(`/admin/properties?error=${encodeURIComponent(msg)}`);
  }

  const data = parsed.data;
  const photos = parsePhotosToJson(formData.get('photos'), { forCreate: true });

  // Persist
  await prisma.property.create({
    data: {
      name: data.name,
      slug: data.slug,
      location: data.location ?? null,
      beds: typeof data.beds === 'number' ? data.beds : null,
      baths: typeof data.baths === 'number' ? data.baths : null,
      description: data.description ?? null,
      nightlyRate: data.nightlyRate,
      cleaningFee: data.cleaningFee,
      minNights: data.minNights,
      photos, // JSON array; never null
    },
  });

  revalidatePath('/admin/properties');
  redirect('/admin/properties?success=created');
}

export async function updateProperty(id: number, formData: FormData) {
  const parsed = PropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/properties?error=${encodeURIComponent(msg)}`);
  }

  const data = parsed.data;
  // Undefined => leave the JSON column untouched
  const photosU = parsePhotosToJson(formData.get('photos'));

  await prisma.property.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      location: data.location ?? null,
      beds: typeof data.beds === 'number' ? data.beds : null,
      baths: typeof data.baths === 'number' ? data.baths : null,
      description: data.description ?? null,
      nightlyRate: data.nightlyRate,
      cleaningFee: data.cleaningFee,
      minNights: data.minNights,
      ...(photosU !== undefined ? { photos: photosU } : {}),
    },
  });

  revalidatePath('/admin/properties');
  redirect('/admin/properties?success=updated');
}

export async function deleteProperty(id: number) {
  await prisma.property.delete({ where: { id } });
  revalidatePath('/admin/properties');
  redirect('/admin/properties?success=deleted');
}
