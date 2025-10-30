'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabaseActionClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';
import { isManagerRole } from '@/lib/auth/propertyMembership';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

async function requireOwnerAdmin(contextMessage: string) {
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect(`/login?redirect=/admin/setup&error=${encodeURIComponent(contextMessage)}`);
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect(`/login?redirect=/admin/setup&error=${encodeURIComponent(contextMessage)}`);
  }

  const memberships = await getUserMemberships(userRecord.id);
  const adminMemberships = memberships.filter((membership) => membership.role === 'OWNER_ADMIN');

  return { userRecord, adminMemberships };
}

function resolveAllowedOrganizationIds(adminMemberships: Array<{ organizationId: number }>) {
  return new Set(adminMemberships.map((membership) => membership.organizationId));
}

async function ensurePropertyAccess(propertyId: number, allowedOrgIds: Set<number>) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  if (!property) {
    redirect(`/admin/setup?error=${encodeURIComponent('Property not found.')}`);
  }

  if (!property.organizationId || !allowedOrgIds.has(property.organizationId)) {
    redirect(`/admin/setup?error=${encodeURIComponent('You do not own that property.')}`);
  }

  return property;
}

async function requirePropertyManager(propertyId: number) {
  const membership = await ensureActionPropertyMembership(propertyId);
  if (!isManagerRole(membership.role)) {
    throw new ActionAuthError('Forbidden', 403);
  }
  return membership;
}

const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
});

export async function setupCreateOrganization(formData: FormData) {
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/setup');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/setup');
  }

  const parsed = CreateOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/setup?error=${encodeURIComponent(msg)}`);
  }

  const name = parsed.data.name.trim();
  const resolvedSlug = slugify(parsed.data.slug || name) || slugify(`org-${Date.now()}`);

  const organization = await prisma.organization.create({
    data: {
      name,
      slug: resolvedSlug,
      memberships: {
        create: {
          userId: userRecord.id,
          role: 'OWNER_ADMIN',
        },
      },
    },
  }).catch(() => {
    redirect(`/admin/setup?error=${encodeURIComponent('Organization name or slug already exists.')}`);
  });

  if (!organization) {
    redirect('/admin/setup');
  }

  revalidatePath('/admin/setup');
  redirect(
    `/admin/setup?success=${encodeURIComponent('organization-created')}&name=${encodeURIComponent(
      organization.name,
    )}&focus=organizations`,
  );
}

const CreatePropertySchema = z.object({
  organizationId: z.coerce.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  location: z.string().optional(),
  beds: z.coerce.number().int().min(0).optional(),
  baths: z.coerce.number().int().min(0).optional(),
  nightlyRate: z.coerce.number().int().min(0),
  cleaningFee: z.coerce.number().int().min(0),
  minNights: z.coerce.number().int().min(1).default(2),
  description: z.string().optional(),
  photos: z.string().optional(),
});

const parsePhotos = (raw: string | undefined) =>
  raw
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

export async function setupCreateProperty(formData: FormData) {
  const { userRecord, adminMemberships } = await requireOwnerAdmin('no-access');
  const allowedOrgIds = resolveAllowedOrganizationIds(adminMemberships);

  const parsed = CreatePropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/setup?error=${encodeURIComponent(msg)}`);
  }

  if (!allowedOrgIds.has(parsed.data.organizationId)) {
    redirect(`/admin/setup?error=${encodeURIComponent('You do not own that organization.')}`);
  }

  const resolvedSlug = slugify(parsed.data.slug || parsed.data.name) || slugify(`${parsed.data.name}-${Date.now()}`);

  const property = await prisma.property.create({
    data: {
      organizationId: parsed.data.organizationId,
      name: parsed.data.name,
      slug: resolvedSlug,
      location: parsed.data.location ?? null,
      beds: parsed.data.beds ?? null,
      baths: parsed.data.baths ?? null,
      description: parsed.data.description ?? null,
      nightlyRate: parsed.data.nightlyRate,
      cleaningFee: parsed.data.cleaningFee,
      minNights: parsed.data.minNights,
      photos: parsePhotos(parsed.data.photos),
    },
  });

  const addManager = String(formData.get('addManager') ?? '').toLowerCase() === 'on';

  if (addManager) {
    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { email: userRecord.email },
      update: {
        firstName: userRecord.firstName ?? userRecord.email.split('@')[0],
        lastName: userRecord.lastName ?? null,
      },
      create: {
        email: userRecord.email,
        firstName: userRecord.firstName ?? userRecord.email.split('@')[0],
        lastName: userRecord.lastName ?? null,
        userId: userRecord.id,
      },
    });

    await prisma.membership.upsert({
      where: {
        ownerProfileId_propertyId: {
          ownerProfileId: ownerProfile.id,
          propertyId: property.id,
        },
      },
      update: {
        userId: userRecord.id,
        role: 'MANAGER',
      },
      create: {
        ownerProfileId: ownerProfile.id,
        propertyId: property.id,
        userId: userRecord.id,
        role: 'MANAGER',
      },
    });
  }

  revalidatePath('/admin/setup');
  redirect(`/admin/setup?success=${encodeURIComponent('property-created')}&focus=properties`);
}

const OwnerSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  email: z.string().email('Valid email required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().optional(),
  shareBps: z.coerce.number().int().min(0).max(10000),
  votingPower: z.coerce.number().int().min(0),
  role: z.enum(['PRIMARY', 'OWNER', 'CARETAKER']).default('OWNER'),
});

const OwnershipUpdateSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().optional(),
  email: z.string().email('Valid email required'),
  shareBps: z.coerce.number().int().min(0).max(10000),
  votingPower: z.coerce.number().int().min(0),
  role: z.enum(['PRIMARY', 'OWNER', 'CARETAKER']).default('OWNER'),
});

export async function setupAddOwner(formData: FormData) {
  const parsed = OwnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/setup?error=${encodeURIComponent(msg)}`);
  }

  const propertyId = parsed.data.propertyId;

  try {
    await requirePropertyManager(propertyId);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        ownerships: {
          select: { shareBps: true },
        },
      },
    });

    if (!property) {
      redirect(`/admin/setup?error=${encodeURIComponent('Property not found.')}`);
    }

    const currentShare = property.ownerships.reduce((total, ownership) => total + ownership.shareBps, 0);
    if (currentShare + parsed.data.shareBps > 10000) {
      redirect(
        `/admin/setup?error=${encodeURIComponent('Shares exceed 100%.')}&focus=${encodeURIComponent(
          `owners-${property.id}`,
        )}`,
      );
    }

    const owner = await prisma.ownerProfile.upsert({
      where: { email: parsed.data.email },
      update: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName ?? null,
      },
      create: {
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName ?? null,
      },
    });

    try {
      await prisma.ownership.create({
        data: {
          propertyId: property.id,
          ownerProfileId: owner.id,
          role: parsed.data.role,
          shareBps: parsed.data.shareBps,
          votingPower: parsed.data.votingPower,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('Unique constraint failed')
          ? 'That owner is already assigned to this property.'
          : 'Could not add owner right now.';
      redirect(
        `/admin/setup?error=${encodeURIComponent(message)}&focus=${encodeURIComponent(`owners-${property.id}`)}`,
      );
    }

    revalidatePath('/admin/setup');
    redirect(
      `/admin/setup?success=${encodeURIComponent('owner-added')}&focus=${encodeURIComponent(`owners-${property.id}`)}`,
    );
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect(`/admin/setup?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function setupUpdateProperty(propertyId: number, formData: FormData) {
  try {
    const membership = await requirePropertyManager(propertyId);
    if (!isManagerRole(membership.role)) {
      throw new ActionAuthError('Forbidden', 403);
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!property) {
      redirect(`/admin/setup?error=${encodeURIComponent('Property not found.')}`);
    }

    const parsed = CreatePropertySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
      redirect(
        `/admin/setup?error=${encodeURIComponent(msg)}&editProperty=${propertyId}&focus=properties`,
      );
    }

    if (parsed.data.organizationId !== property.organizationId) {
      redirect(`/admin/setup?error=${encodeURIComponent('Organization changes require admin assistance.')}`);
    }

    const resolvedSlug = slugify(parsed.data.slug || parsed.data.name) || slugify(`${parsed.data.name}-${Date.now()}`);

    await prisma.property.update({
      where: { id: property.id },
      data: {
        name: parsed.data.name,
        slug: resolvedSlug,
        location: parsed.data.location ?? null,
        beds: parsed.data.beds ?? null,
        baths: parsed.data.baths ?? null,
        description: parsed.data.description ?? null,
        nightlyRate: parsed.data.nightlyRate,
        cleaningFee: parsed.data.cleaningFee,
        minNights: parsed.data.minNights,
        photos: parsePhotos(parsed.data.photos),
      },
    });

    revalidatePath('/admin/setup');
    redirect(`/admin/setup?success=${encodeURIComponent('property-updated')}&focus=properties`);
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect(`/admin/setup?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function setupDeleteProperty(propertyId: number) {
  const { adminMemberships } = await requireOwnerAdmin('no-access');
  const allowedOrgIds = resolveAllowedOrganizationIds(adminMemberships);
  const property = await ensurePropertyAccess(propertyId, allowedOrgIds);

  await prisma.property.delete({ where: { id: property.id } });

  revalidatePath('/admin/setup');
  redirect(`/admin/setup?success=${encodeURIComponent('property-deleted')}&focus=properties`);
}

export async function setupDetachProperty(propertyId: number) {
  const { adminMemberships } = await requireOwnerAdmin('no-access');
  const allowedOrgIds = resolveAllowedOrganizationIds(adminMemberships);
  const property = await ensurePropertyAccess(propertyId, allowedOrgIds);

  await prisma.property.update({
    where: { id: property.id },
    data: { organizationId: null },
  });

  revalidatePath('/admin/setup');
  redirect(`/admin/setup?success=${encodeURIComponent('property-detached')}&focus=organizations`);
}

export async function setupDeleteOrganization(organizationId: number) {
  const { adminMemberships } = await requireOwnerAdmin('no-access');
  const allowedOrgIds = resolveAllowedOrganizationIds(adminMemberships);

  if (!allowedOrgIds.has(organizationId)) {
    redirect(`/admin/setup?error=${encodeURIComponent('You do not own that organization.')}`);
  }

  const propertyCount = await prisma.property.count({ where: { organizationId } });
  if (propertyCount > 0) {
    redirect(
      `/admin/setup?error=${encodeURIComponent(
        'Detach properties before deleting an organization.',
      )}&focus=organizations`,
    );
  }

  await prisma.organization.delete({ where: { id: organizationId } });

  revalidatePath('/admin/setup');
  redirect(`/admin/setup?success=${encodeURIComponent('organization-deleted')}&focus=organizations`);
}

export async function setupUpdateOwnership(ownershipId: number, formData: FormData) {
  const parsed = OwnershipUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    const propertyKey = String(formData.get('propertyId') ?? 'unknown');
    redirect(`/admin/setup?error=${encodeURIComponent(msg)}&focus=${encodeURIComponent(`owners-${propertyKey}`)}`);
  }

  const ownership = await prisma.ownership.findUnique({
    where: { id: ownershipId },
    include: {
      property: {
        select: {
          id: true,
        },
      },
      ownerProfile: true,
    },
  });

  if (!ownership || !ownership.property) {
    redirect(`/admin/setup?error=${encodeURIComponent('Owner record not found.')}`);
  }

  if (ownership.property.id !== parsed.data.propertyId) {
    redirect(`/admin/setup?error=${encodeURIComponent('Owner does not match property.')}`);
  }

  try {
    await requirePropertyManager(ownership.property.id);

    if (!ownership.ownerProfile) {
      redirect(
        `/admin/setup?error=${encodeURIComponent('Owner record not found.')}&focus=${encodeURIComponent(
          `owners-${ownership.property.id}`,
        )}`,
      );
    }

    const siblingShare = await prisma.ownership.aggregate({
      where: {
        propertyId: ownership.property.id,
        NOT: { id: ownershipId },
      },
      _sum: { shareBps: true },
    });

    const otherShare = siblingShare._sum.shareBps ?? 0;
    if (otherShare + parsed.data.shareBps > 10000) {
      redirect(
        `/admin/setup?error=${encodeURIComponent('Shares exceed 100%.')}&focus=${encodeURIComponent(
          `owners-${ownership.property.id}`,
        )}`,
      );
    }

    const trimmedFirstName = parsed.data.firstName.trim();
    if (!trimmedFirstName) {
      redirect(
        `/admin/setup?error=${encodeURIComponent('First name is required.')}&focus=${encodeURIComponent(
          `owners-${ownership.property.id}`,
        )}`,
      );
    }

    const trimmedLastName = parsed.data.lastName?.trim() || null;
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    if (!normalizedEmail) {
      redirect(
        `/admin/setup?error=${encodeURIComponent('Email is required.')}&focus=${encodeURIComponent(
          `owners-${ownership.property.id}`,
        )}`,
      );
    }

    try {
      await prisma.ownerProfile.update({
        where: { id: ownership.ownerProfile.id },
        data: {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: normalizedEmail,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        redirect(
          `/admin/setup?error=${encodeURIComponent('Another owner already uses that email.')}&focus=${encodeURIComponent(
            `owners-${ownership.property.id}`,
          )}`,
        );
      }
      throw error;
    }

    await prisma.ownership.update({
      where: { id: ownershipId },
      data: {
        shareBps: parsed.data.shareBps,
        votingPower: parsed.data.votingPower,
        role: parsed.data.role,
      },
    });

    revalidatePath('/admin/setup');
    redirect(
      `/admin/setup?success=${encodeURIComponent('ownership-updated')}&focus=${encodeURIComponent(
        `owners-${ownership.property.id}`,
      )}`,
    );
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect(`/admin/setup?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}

export async function setupRemoveOwnership(ownershipId: number, formData: FormData) {
  const propertyIdRaw = formData.get('propertyId');
  const propertyId = Number(propertyIdRaw);
  if (!propertyId) {
    redirect('/admin/setup?error=Missing%20property%20context');
  }

  const ownership = await prisma.ownership.findUnique({
    where: { id: ownershipId },
    select: {
      id: true,
      propertyId: true,
    },
  });

  if (!ownership || ownership.propertyId !== propertyId) {
    redirect(
      `/admin/setup?error=${encodeURIComponent('Owner does not match property.')}&focus=${encodeURIComponent(
        `owners-${propertyId}`,
      )}`,
    );
  }

  try {
    await requirePropertyManager(propertyId);
    await prisma.ownership.delete({ where: { id: ownershipId } });

    revalidatePath('/admin/setup');
    redirect(
      `/admin/setup?success=${encodeURIComponent('owner-removed')}&focus=${encodeURIComponent(
        `owners-${propertyId}`,
      )}`,
    );
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect(`/admin/setup?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}
