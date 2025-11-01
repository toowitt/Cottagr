'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';
import { isManagerRole } from '@/lib/auth/capabilities';
import { generateInviteToken, calculateInviteExpiry } from '@/lib/auth/inviteTokens';
import { sendOwnerInviteEmail } from '@/server/lib/ownerInviteEmail';
import type { PropertyMembershipRole } from '@prisma/client';

const assignExistingOwnerSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  ownerProfileId: z.coerce.number().int().positive(),
  shareBps: z.coerce.number().int().min(0).max(10_000),
  votingPower: z.coerce.number().int().min(0),
});

const createOwnerAndAssignSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Valid email required'),
  shareBps: z.coerce.number().int().min(0).max(10_000),
  votingPower: z.coerce.number().int().min(0),
});

function buildRedirect(path: string, search: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function ensureShareCapacity(propertyId: number, additionalShare: number) {
  const totalShare = await prisma.ownership.aggregate({
    where: { propertyId },
    _sum: { shareBps: true },
  });

  const currentShare = totalShare._sum.shareBps ?? 0;
  if (currentShare + additionalShare > 10_000) {
    return false;
  }

  return true;
}

async function requirePropertyManager(propertyId: number) {
  const membership = await ensureActionPropertyMembership(propertyId);
  if (!isManagerRole(membership.role)) {
    throw new ActionAuthError('Forbidden', 403);
  }
  return membership;
}

function redirectWithError(message: string, propertyId: number | undefined): never {
  redirect(
    buildRedirect('/admin/owners', {
      error: message,
      propertyId,
    }),
  );
}

function redirectWithSuccess(message: string, propertyId: number): never {
  redirect(
    buildRedirect('/admin/owners', {
      success: message,
      propertyId,
    }),
  );
}

function handleActionError(error: unknown, propertyId: number | undefined): never {
  if (error instanceof ActionAuthError) {
    redirectWithError(error.message, propertyId);
  }
  throw error instanceof Error ? error : new Error('Unexpected error');
}

type OwnerInviteContext = {
  email: string;
  token: string;
  propertyId: number;
  propertyName: string;
  organizationId: number | null;
  organizationName: string | null;
  role: PropertyMembershipRole;
};

export async function assignExistingOwner(formData: FormData) {
  const parsed = assignExistingOwnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(
      buildRedirect('/admin/owners', {
        error: msg,
        propertyId: formData.get('propertyId')?.toString(),
      }),
    );
  }

  const { propertyId, ownerProfileId, shareBps, votingPower } = parsed.data;
  let inviteContext: OwnerInviteContext | undefined;

  try {
    await requirePropertyManager(propertyId);

    const hasCapacity = await ensureShareCapacity(propertyId, shareBps);
    if (!hasCapacity) {
      redirectWithError('Adding this share exceeds 100%', propertyId);
    }

    try {
      await prisma.$transaction(async (tx) => {
        const [property, ownerProfile] = await Promise.all([
          tx.property.findUnique({
            where: { id: propertyId },
            select: {
              id: true,
              name: true,
              organizationId: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          tx.ownerProfile.findUnique({
            where: { id: ownerProfileId },
            select: {
              id: true,
              email: true,
            },
          }),
        ]);

        if (!property || !ownerProfile) {
          redirectWithError('Invalid property or owner.', propertyId);
          return;
        }

        await tx.ownership.create({
          data: {
            propertyId,
            ownerProfileId,
            shareBps,
            votingPower,
          },
        });

        const membership = await tx.membership.findUnique({
          where: {
            ownerProfileId_propertyId: {
              ownerProfileId,
              propertyId,
            },
          },
          select: { id: true },
        });

        if (!membership) {
          await tx.invite.updateMany({
            where: {
              propertyId,
              ownerProfileId,
              status: 'PENDING',
            },
            data: { status: 'REVOKED' },
          });

          const invite = await tx.invite.create({
            data: {
              propertyId,
              ownerProfileId,
              token: generateInviteToken(),
              email: ownerProfile.email.toLowerCase(),
              role: 'OWNER',
              status: 'PENDING',
              expiresAt: calculateInviteExpiry(),
            },
          });

          inviteContext = {
            email: ownerProfile.email,
            token: invite.token,
            propertyId: property.id,
            propertyName: property.name,
            organizationId: property.organization?.id ?? property.organizationId ?? null,
            organizationName: property.organization?.name ?? null,
            role: 'OWNER',
          };
        }
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('Unique constraint failed')
          ? 'That owner is already assigned to this property.'
          : 'Could not assign owner. Please try again.';

      redirectWithError(message, propertyId);
    }

    if (inviteContext) {
      await sendOwnerInviteEmail({
        email: inviteContext.email,
        propertyId: inviteContext.propertyId,
        inviteToken: inviteContext.token,
        propertyName: inviteContext.propertyName,
        organizationId: inviteContext.organizationId,
        organizationName: inviteContext.organizationName,
        role: inviteContext.role,
      });
    }

    revalidatePath('/admin/owners');
    redirectWithSuccess('assigned', propertyId);
  } catch (error) {
    handleActionError(error, propertyId);
  }
}

export async function createOwnerAndAssign(formData: FormData) {
  const parsed = createOwnerAndAssignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(
      buildRedirect('/admin/owners', {
        error: msg,
        propertyId: formData.get('propertyId')?.toString(),
      }),
    );
  }

  const { propertyId, firstName, lastName, email, shareBps, votingPower } = parsed.data;
  let inviteContext: OwnerInviteContext | undefined;

  try {
    await requirePropertyManager(propertyId);

    const hasCapacity = await ensureShareCapacity(propertyId, shareBps);
    if (!hasCapacity) {
      redirectWithError('Adding this share exceeds 100%', propertyId);
    }

    const normalizedLastName = lastName?.trim() || null;

    const existingOwner = await prisma.ownerProfile.findUnique({ where: { email } });
    try {
      await prisma.$transaction(async (tx) => {
        const property = await tx.property.findUnique({
          where: { id: propertyId },
          select: {
            id: true,
            name: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!property) {
          redirectWithError('Property not found', propertyId);
          return;
        }

        const owner = existingOwner
          ? await tx.ownerProfile.update({
              where: { id: existingOwner.id },
              data: {
                firstName,
                lastName: normalizedLastName,
              },
            })
          : await tx.ownerProfile.create({
              data: {
                email,
                firstName,
                lastName: normalizedLastName,
              },
            });

        await tx.ownership.create({
          data: {
            propertyId,
            ownerProfileId: owner.id,
            shareBps,
            votingPower,
          },
        });

        const membership = await tx.membership.findUnique({
          where: {
            ownerProfileId_propertyId: {
              ownerProfileId: owner.id,
              propertyId,
            },
          },
          select: { id: true },
        });

        if (!membership) {
          await tx.invite.updateMany({
            where: {
              propertyId,
              ownerProfileId: owner.id,
              status: 'PENDING',
            },
            data: { status: 'REVOKED' },
          });

        const invite = await tx.invite.create({
          data: {
            propertyId,
            ownerProfileId: owner.id,
            token: generateInviteToken(),
            email: owner.email.toLowerCase(),
            role: 'OWNER',
            status: 'PENDING',
            expiresAt: calculateInviteExpiry(),
          },
        });

          inviteContext = {
            email: owner.email,
            token: invite.token,
            propertyId: property.id,
            propertyName: property.name,
            organizationId: property.organization?.id ?? property.organizationId ?? null,
            organizationName: property.organization?.name ?? null,
            role: 'OWNER',
          };
        }
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('Unique constraint failed')
          ? 'That owner is already assigned to this property.'
          : 'Could not assign owner. Please try again.';

      redirectWithError(message, propertyId);
    }

    if (inviteContext) {
      await sendOwnerInviteEmail({
        email: inviteContext.email,
        propertyId: inviteContext.propertyId,
        inviteToken: inviteContext.token,
        propertyName: inviteContext.propertyName,
        organizationId: inviteContext.organizationId,
        organizationName: inviteContext.organizationName,
        role: inviteContext.role,
      });
    }

    revalidatePath('/admin/owners');
    redirectWithSuccess('created', propertyId);
  } catch (error) {
    handleActionError(error, propertyId);
  }
}

export async function deleteOwnership(formData: FormData) {
  const id = Number(formData.get('id'));
  const propertyId = Number(formData.get('propertyId')) || undefined;

  if (!id) {
    redirectWithError('Missing ownership id', propertyId);
  }

  const ownership = await prisma.ownership.findUnique({
    where: { id },
    select: {
      id: true,
      propertyId: true,
    },
  });

  if (!ownership) {
    redirectWithError('Ownership not found', propertyId);
  }

  try {
    await requirePropertyManager(ownership.propertyId);
    await prisma.ownership.delete({ where: { id: ownership.id } });
    revalidatePath('/admin/owners');
    redirectWithSuccess('deleted', ownership.propertyId);
  } catch (error) {
    handleActionError(error, ownership.propertyId);
  }
}
