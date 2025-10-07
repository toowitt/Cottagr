'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
});

export async function createOrganization(formData: FormData) {
  const parsed = CreateOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/organizations?error=${encodeURIComponent(msg)}`);
  }

  const name = parsed.data.name.trim();
  const resolvedSlug = slugify(parsed.data.slug || name) || slugify(`org-${Date.now()}`);

  try {
    await prisma.organization.create({
      data: {
        name,
        slug: resolvedSlug,
      },
    });
  } catch {
    redirect(
      `/admin/organizations?error=${encodeURIComponent('Organization name or slug already exists.')}`,
    );
  }

  revalidatePath('/admin/organizations');
  redirect('/admin/organizations?success=created');
}

const AttachPropertySchema = z.object({
  organizationId: z.coerce.number().int().positive(),
  propertyId: z.coerce.number().int().positive(),
});

export async function attachProperty(formData: FormData) {
  const parsed = AttachPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/organizations?error=${encodeURIComponent(msg)}`);
  }

  const { organizationId, propertyId } = parsed.data;

  await prisma.property.update({
    where: { id: propertyId },
    data: { organizationId },
  });

  revalidatePath('/admin/organizations');
  redirect('/admin/organizations?success=attached');
}

const DetachPropertySchema = z.object({
  propertyId: z.coerce.number().int().positive(),
});

export async function detachProperty(formData: FormData) {
  const parsed = DetachPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/organizations?error=${encodeURIComponent(msg)}`);
  }

  const { propertyId } = parsed.data;

  await prisma.property.update({
    where: { id: propertyId },
    data: { organizationId: null },
  });

  revalidatePath('/admin/organizations');
  redirect('/admin/organizations?success=detached');
}

const DeleteOrganizationSchema = z.object({
  organizationId: z.coerce.number().int().positive(),
});

export async function deleteOrganization(formData: FormData) {
  const parsed = DeleteOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid input';
    redirect(`/admin/organizations?error=${encodeURIComponent(msg)}`);
  }

  const { organizationId } = parsed.data;

  const propertyCount = await prisma.property.count({ where: { organizationId } });
  if (propertyCount > 0) {
    redirect(
      `/admin/organizations?error=${encodeURIComponent('Detach properties before deleting an organization.')}`,
    );
  }

  await prisma.organization.delete({ where: { id: organizationId } });
  revalidatePath('/admin/organizations');
  redirect('/admin/organizations?success=deleted');
}
