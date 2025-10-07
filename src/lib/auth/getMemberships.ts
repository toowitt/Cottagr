import { prisma } from '@/lib/prisma';

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
