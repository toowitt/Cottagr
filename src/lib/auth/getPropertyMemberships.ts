import { prisma } from '@/lib/prisma';

export async function getPropertyMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          slug: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      ownerProfile: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
