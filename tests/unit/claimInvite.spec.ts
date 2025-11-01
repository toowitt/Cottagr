import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteStatus, PropertyMembershipRole } from '@prisma/client';
import crypto from 'node:crypto';
import type { StoredMailMessage } from '@/server/lib/mailer';

type InviteRecord = {
  id: number;
  token: string;
  email: string;
  propertyId: number;
  ownerProfileId: number;
  role: PropertyMembershipRole;
  status: InviteStatus;
  claimedAt: Date | null;
  claimedById: string | null;
};

type MembershipRecord = {
  id: string;
  ownerProfileId: number;
  propertyId: number;
  userId: string;
  role: PropertyMembershipRole;
  createdAt: Date;
  updatedAt: Date;
};

type OwnerProfileRecord = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type PropertyRecord = {
  id: number;
  name: string;
  slug: string;
  organizationId: number | null;
};

type MockStore = {
  invites: Map<string, InviteRecord>;
  memberships: Map<string, MembershipRecord>;
  ownerProfiles: Map<number, OwnerProfileRecord>;
  properties: Map<number, PropertyRecord>;
  nextInviteId: number;
};

type MockTransactionClient = {
  invite: {
    findUnique(args: { where: { token: string } }): Promise<InviteRecord | null>;
    update(args: { where: { id: number }; data: Partial<InviteRecord> }): Promise<InviteRecord>;
  };
  membership: {
    upsert(args: {
      where: { ownerProfileId_propertyId: { ownerProfileId: number; propertyId: number } };
      update: Partial<MembershipRecord>;
      create: MembershipRecord;
      select?: unknown;
    }): Promise<ReturnType<typeof createMembershipResult>>;
  };
};

type MockPrismaClient = {
  $transaction<T>(callback: (tx: MockTransactionClient) => Promise<T>): Promise<T>;
  __store: MockStore;
  __reset(): void;
};

const createMembershipResult = (
  record: MembershipRecord,
  owner: OwnerProfileRecord | undefined,
  property: PropertyRecord | undefined,
) => ({
  id: record.id,
  role: record.role,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  propertyId: record.propertyId,
  ownerProfileId: record.ownerProfileId,
  userId: record.userId,
  property: {
    id: property?.id ?? record.propertyId,
    name: property?.name ?? 'Mock Property',
    slug: property?.slug ?? 'mock-property',
    organizationId: property?.organizationId ?? null,
  },
  ownerProfile: {
    id: owner?.id ?? record.ownerProfileId,
    email: owner?.email ?? 'mock@example.com',
    firstName: owner?.firstName ?? null,
    lastName: owner?.lastName ?? null,
  },
});

vi.mock('@/lib/prisma', () => {
  const store: MockStore = {
    invites: new Map(),
    memberships: new Map(),
    ownerProfiles: new Map(),
    properties: new Map(),
    nextInviteId: 1,
  };

  const prisma = {
    async $transaction<T>(callback: (tx: MockTransactionClient) => Promise<T>): Promise<T> {
      return callback({
        invite: {
          findUnique: async ({ where: { token } }: { where: { token: string } }) => {
            const invite = store.invites.get(token);
            return invite ? { ...invite } : null;
          },
          update: async ({ where: { id }, data }: { where: { id: number }; data: Partial<InviteRecord> }) => {
            for (const [token, invite] of store.invites) {
              if (invite.id === id) {
                const updated: InviteRecord = {
                  ...invite,
                  ...data,
                  claimedAt: data.claimedAt ?? invite.claimedAt,
                  claimedById: data.claimedById ?? invite.claimedById,
                  status: (data.status as InviteStatus | undefined) ?? invite.status,
                };
                store.invites.set(token, updated);
                return { ...updated };
              }
            }
            throw new Error('Invite not found');
          },
        },
        membership: {
          upsert: async ({
            where: {
              ownerProfileId_propertyId: { ownerProfileId, propertyId },
            },
            update,
            create,
          }: {
            where: { ownerProfileId_propertyId: { ownerProfileId: number; propertyId: number } };
            update: Partial<MembershipRecord>;
            create: MembershipRecord;
            select?: unknown;
          }) => {
            const key = `${ownerProfileId}:${propertyId}`;
            const existing = store.memberships.get(key);
            const now = new Date();
            let record: MembershipRecord;
            if (existing) {
              record = {
                ...existing,
                ...update,
                updatedAt: now,
              };
            } else {
              record = {
                id: `mock-membership-${crypto.randomUUID()}`,
                ownerProfileId,
                propertyId,
                userId: create.userId,
                role: create.role,
                createdAt: now,
                updatedAt: now,
              };
            }
            store.memberships.set(key, record);

            const owner = store.ownerProfiles.get(ownerProfileId);
            const property = store.properties.get(propertyId);
            return createMembershipResult(record, owner, property);
          },
        },
      } as MockTransactionClient);
    },
    __store: store,
    __reset() {
      store.invites.clear();
      store.memberships.clear();
      store.ownerProfiles.clear();
      store.properties.clear();
      store.nextInviteId = 1;
    },
  } satisfies MockPrismaClient;

  return { prisma };
});

vi.mock('@/server/lib/mailer', () => ({
  pushTestMail: vi.fn(),
  sendMail: vi.fn(),
  getTestMailbox: vi.fn(() => [] as StoredMailMessage[]),
  clearTestMailbox: vi.fn(),
  getLastTestMail: vi.fn(() => null),
}));

const prismaModule = await import('@/lib/prisma');
const mockPrisma = prismaModule.prisma as unknown as MockPrismaClient;

const { claimInviteByToken } = await import('@/lib/auth/claimInvite');

describe('claimInviteByToken', () => {
  beforeEach(() => {
    mockPrisma.__reset();
  });

  it('claims an invite idempotently and upserts a single membership per property', async () => {
    const email = 'viewer+idempotent@example.com';
    const userId = crypto.randomUUID();
    const ownerProfileId = 101;
    const propertyId = 202;
    const token = crypto.randomUUID().replace(/-/g, '');

    mockPrisma.__store.ownerProfiles.set(ownerProfileId, {
      id: ownerProfileId,
      email,
      firstName: 'Viewer',
      lastName: 'Example',
    });

    mockPrisma.__store.properties.set(propertyId, {
      id: propertyId,
      name: 'Idempotent Cabin',
      slug: 'idempotent-cabin',
      organizationId: null,
    });

    mockPrisma.__store.invites.set(token, {
      id: mockPrisma.__store.nextInviteId++,
      token,
      email,
      propertyId,
      ownerProfileId,
      role: 'VIEWER',
      status: InviteStatus.PENDING,
      claimedAt: null,
      claimedById: null,
    });

    const first = await claimInviteByToken(token, userId, email);
    expect(first.alreadyClaimed).toBe(false);
    expect(first.membership.propertyId).toBe(propertyId);
    expect(first.membership.userId).toBe(userId);
    expect(first.membership.role).toBe('VIEWER');

    const second = await claimInviteByToken(token, userId, email);
    expect(second.alreadyClaimed).toBe(true);
    expect(second.membership.id).toBe(first.membership.id);

    const storedMemberships = Array.from(mockPrisma.__store.memberships.values());
    expect(storedMemberships).toHaveLength(1);
    expect(storedMemberships[0]).toMatchObject({
      userId,
      propertyId,
      role: 'VIEWER',
    });

    const storedInvite = mockPrisma.__store.invites.get(token);
    expect(storedInvite?.status).toBe(InviteStatus.CLAIMED);
    expect(storedInvite?.claimedById).toBe(userId);
    expect(storedInvite?.claimedAt).toBeInstanceOf(Date);
  });
});
