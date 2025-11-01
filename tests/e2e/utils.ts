import { PrismaClient, PropertyMembershipRole } from '@prisma/client';
import crypto from 'node:crypto';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();
if (!globalThis.__prisma) {
  globalThis.__prisma = prisma;
}

export function randomEmail(label: string) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${label}-${suffix}@example.com`;
}

export function randomString(prefix: string) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

export async function ensureSupabaseUser(email: string, _password: string, name?: string) {
  const lowerEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lowerEmail } });

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const [firstName, ...rest] = (name ?? '').trim().split(' ').filter(Boolean);
  const lastName = rest.length > 0 ? rest.join(' ') : null;

  return prisma.user.create({
    data: {
      id,
      email: lowerEmail,
      firstName: firstName ?? null,
      lastName,
    },
  });
}

export async function deleteSupabaseUserByEmail(email: string) {
  const lowerEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (!existing) {
    return;
  }

  await prisma.membership.deleteMany({ where: { userId: existing.id } });
  await prisma.ownerProfile.updateMany({ where: { userId: existing.id }, data: { userId: null } });
  await prisma.organizationMembership.deleteMany({ where: { userId: existing.id } });
  await prisma.user.delete({ where: { id: existing.id } });
}

export async function assertUniqueMemberships(propertyId: number, userId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      propertyId,
      userId,
    },
  });

  if (memberships.length > 1) {
    throw new Error(`Expected at most one membership for property ${propertyId} and user ${userId}`);
  }
}

export async function upsertViewerMembership(
  ownerProfileId: number,
  propertyId: number,
  role: PropertyMembershipRole,
) {
  // Memberships are now created during invite claim; this helper is retained for
  // backwards compatibility in tests but no longer needs to seed state.
  return Promise.resolve({ ownerProfileId, propertyId, role });
}
