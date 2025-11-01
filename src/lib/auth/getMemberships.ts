import { prisma } from '@/lib/prisma';

export async function getUserMemberships(userId: string) {
  return prisma.organizationMembership.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
