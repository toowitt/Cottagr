import { beforeEach, describe, expect, it, vi } from 'vitest';

const membershipFindFirst = vi.fn();
const membershipFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    membership: {
      findFirst: membershipFindFirst,
      findMany: membershipFindMany,
    },
  },
}));

const { requirePropertyMembership, PropertyMembershipError, listAccessiblePropertyIds } =
  await import('../propertyMembership');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requirePropertyMembership', () => {
  it('returns membership when found', async () => {
    const membership = {
      id: 1,
      role: 'OWNER',
      propertyId: 123,
      ownerProfileId: 456,
      userId: 'user-1',
      property: {
        id: 123,
        name: 'Cabin',
        slug: 'cabin',
        organizationId: 99,
      },
      ownerProfile: {
        id: 456,
        email: 'owner@example.com',
        firstName: 'Pat',
        lastName: 'Owner',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    membershipFindFirst.mockResolvedValueOnce(membership);

    const result = await requirePropertyMembership('user-1', 123);
    expect(result).toEqual(membership);
    expect(membershipFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', propertyId: 123 },
      select: expect.any(Object),
    });
  });

  it('throws PropertyMembershipError when not found', async () => {
    membershipFindFirst.mockResolvedValueOnce(null);

    await expect(requirePropertyMembership('user-2', 999)).rejects.toBeInstanceOf(PropertyMembershipError);
  });
});

describe('listAccessiblePropertyIds', () => {
  it('returns property ids for memberships', async () => {
    membershipFindMany.mockResolvedValueOnce([{ propertyId: 1 }, { propertyId: 2 }]);

    const ids = await listAccessiblePropertyIds('user-3');
    expect(ids).toEqual([1, 2]);
    expect(membershipFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-3' },
      select: { propertyId: true },
    });
  });
});
