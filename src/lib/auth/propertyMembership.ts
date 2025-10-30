import { prisma } from '@/lib/prisma';
import type { Membership, PropertyMembershipRole } from '@prisma/client';

export class PropertyMembershipError extends Error {
  status: number;

  constructor(message = 'Not authorized for this property', status = 403) {
    super(message);
    this.status = status;
  }
}

export type PropertyMembershipWithRelations = Membership & {
  property: {
    id: number;
    name: string;
    slug: string;
    organizationId: number | null;
  };
  ownerProfile: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export const membershipSelect = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  propertyId: true,
  ownerProfileId: true,
  userId: true,
  property: {
    select: {
      id: true,
      name: true,
      slug: true,
      organizationId: true,
    },
  },
  ownerProfile: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Record<string, unknown>;

export async function findPropertyMembership(userId: string, propertyId: number) {
  return prisma.membership.findFirst({
    where: { userId, propertyId },
    select: membershipSelect,
  }) as Promise<PropertyMembershipWithRelations | null>;
}

export async function requirePropertyMembership(userId: string, propertyId: number) {
  const membership = await findPropertyMembership(userId, propertyId);
  if (!membership) {
    throw new PropertyMembershipError();
  }
  return membership;
}

export async function listAccessiblePropertyIds(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { propertyId: true },
  });
  return memberships.map((membership) => membership.propertyId);
}

export const isManagerRole = (role: PropertyMembershipRole) =>
  role === 'MANAGER' || role === 'OWNER';
