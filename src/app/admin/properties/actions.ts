'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';
import { isManagerRole } from '@/lib/auth/propertyMembership';
import { createServerSupabaseActionClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';

/** Turn the comma-separated photos input into a Prisma JSON value */
function parsePhotosToJson(
  val: FormDataEntryValue | null,
  opts?: { forCreate?: boolean }
): Prisma.InputJsonValue | undefined {
  const s = (val?.toString() ?? '').trim();
  if (!s) {
    return opts?.forCreate ? ([] as unknown as Prisma.InputJsonValue) : undefined;
  }
  const arr = s.split(',').map((x) => x.trim()).filter(Boolean);
  return arr as unknown as Prisma.InputJsonValue;
}

const blankToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);

const PropertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  location: z.preprocess(blankToUndef, z.string().min(1).optional()),
  beds: z.preprocess(blankToUndef, z.coerce.number().int().min(0)).optional(),
  baths: z.preprocess(blankToUndef, z.coerce.number().int().min(0)).optional(),
  nightlyRate: z.preprocess(
    blankToUndef,
    z.coerce.number().int().min(0, 'Nightly rate must be a non-negative integer (in cents)'),
  ),
  cleaningFee: z.preprocess(
    blankToUndef,
    z.coerce.number().int().min(0, 'Cleaning fee must be a non-negative integer (in cents)'),
  ),
  minNights: z.preprocess(blankToUndef, z.coerce.number().int().min(1, 'Minimum nights must be at least 1')),
  description: z.preprocess(blankToUndef, z.string().optional()),
  photos: z.string().optional(),
  organizationId: z.preprocess(blankToUndef, z.coerce.number().int().positive()).optional(),
});

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

export async function createProperty(formData: FormData) {
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/properties');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/properties');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminOrgIds = new Set(memberships.filter((m) => m.role === 'OWNER_ADMIN').map((m) => m.organizationId));

  const parsed = PropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/properties?error=${encodeURIComponent(msg)}`);
  }

  const data = parsed.data;
  if (typeof data.organizationId === 'number' && !adminOrgIds.has(data.organizationId)) {
    redirect('/admin/properties?error=You%20do%20not%20have%20permission%20for%20that%20organization');
  }

  const resolvedSlug = slugify(data.slug || data.name) || slugify(`property-${Date.now()}`);
  const photos = parsePhotosToJson(formData.get('photos'), { forCreate: true });

  await prisma.property.create({
    data: {
      name: data.name,
      slug: resolvedSlug,
      location: data.location ?? null,
      beds: typeof data.beds === 'number' ? data.beds : null,
      baths: typeof data.baths === 'number' ? data.baths : null,
      description: data.description ?? null,
      nightlyRate: data.nightlyRate,
      cleaningFee: data.cleaningFee,
      minNights: data.minNights,
      organizationId: typeof data.organizationId === 'number' ? data.organizationId : null,
      photos,
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
  const resolvedSlug = slugify(data.slug || data.name) || slugify(`property-${Date.now()}`);
  const photosU = parsePhotosToJson(formData.get('photos'));

  try {
    const membership = await ensureActionPropertyMembership(id);
    if (!isManagerRole(membership.role)) {
      throw new ActionAuthError('Forbidden', 403);
    }

    const property = await prisma.property.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!property) {
      redirect('/admin/properties?error=Property%20not%20found');
    }

    if (
      typeof data.organizationId === 'number' &&
      property?.organizationId !== data.organizationId
    ) {
      redirect('/admin/properties?error=Organization%20changes%20require%20admin%20assistance');
    }

    await prisma.property.update({
      where: { id },
      data: {
        name: data.name,
        slug: resolvedSlug,
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
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect(`/admin/properties?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath('/admin/properties');
  redirect('/admin/properties?success=updated');
}

export async function deleteProperty(id: number) {
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/properties');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/properties');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminOrgIds = new Set(memberships.filter((m) => m.role === 'OWNER_ADMIN').map((m) => m.organizationId));

  const property = await prisma.property.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (!property) {
    redirect('/admin/properties?error=Property%20not%20found');
  }

  if (property?.organizationId && !adminOrgIds.has(property.organizationId)) {
    redirect('/admin/properties?error=You%20do%20not%20have%20permission%20to%20delete%20this%20property');
  }

  await prisma.property.delete({ where: { id } });

  revalidatePath('/admin/properties');
  redirect('/admin/properties?success=deleted');
}
