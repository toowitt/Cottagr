import { describe, expect, it } from 'vitest';
import { InviteStatus, OwnershipRole, PropertyMembershipRole } from '@prisma/client';
import {
  planMembershipBackfill,
  describeBackfillOperation,
  BackfillOwnerProfile,
  BackfillUser,
} from '../backfill';

const makeProfile = (overrides: Partial<BackfillOwnerProfile>): BackfillOwnerProfile => ({
  id: 1,
  email: 'owner@example.com',
  userId: null,
  ownerships: [],
  memberships: [],
  invites: [],
  ...overrides,
});

const makeUser = (overrides: Partial<BackfillUser>): BackfillUser => ({
  id: 'user-1',
  email: 'owner@example.com',
  ...overrides,
});

describe('planMembershipBackfill', () => {
  it('links owner profiles, creates memberships, and claims invites when matched by email', () => {
    const plan = planMembershipBackfill(
      [
        makeProfile({
          ownerships: [{ propertyId: 10, role: OwnershipRole.OWNER }],
          invites: [{ id: 99, propertyId: 10, status: InviteStatus.PENDING, role: PropertyMembershipRole.OWNER }],
        }),
      ],
      [makeUser({})],
    );

    expect(plan.conflicts).toHaveLength(0);
    expect(plan.operations).toHaveLength(3);
    expect(plan.linkedProfiles).toBe(1);
    expect(plan.membershipsCreated).toBe(1);
    expect(plan.invitesClaimed).toBe(1);

    expect(plan.operations.map((op) => describeBackfillOperation(op))).toEqual([
      'Link ownerProfile#1 → user user-1',
      'Create membership (ownerProfile#1 → property#10) as OWNER',
      'Mark invite#99 as CLAIMED',
    ]);
  });

  it('skips membership creation when one already exists', () => {
    const plan = planMembershipBackfill(
      [
        makeProfile({
          userId: 'user-1',
          ownerships: [{ propertyId: 10, role: OwnershipRole.OWNER }],
          memberships: [{ propertyId: 10, userId: 'user-1', role: PropertyMembershipRole.OWNER }],
          invites: [{ id: 42, propertyId: 10, status: InviteStatus.PENDING, role: PropertyMembershipRole.OWNER }],
        }),
      ],
      [makeUser({})],
    );

    expect(plan.operations).toHaveLength(1);
    expect(plan.linkedProfiles).toBe(0);
    expect(plan.membershipsCreated).toBe(0);
    expect(plan.invitesClaimed).toBe(1);

    expect(plan.operations[0]).toMatchObject({
      type: 'claim-invite',
      inviteId: 42,
    });
  });

  it('assigns caretaker roles as manager memberships', () => {
    const plan = planMembershipBackfill(
      [
        makeProfile({
          ownerships: [{ propertyId: 7, role: OwnershipRole.CARETAKER }],
        }),
      ],
      [makeUser({})],
    );

    expect(plan.operations).toHaveLength(2);
    const membershipOp = plan.operations.find((op) => op.type === 'create-membership');
    expect(membershipOp).toBeTruthy();
    if (membershipOp?.type === 'create-membership') {
      expect(membershipOp.role).toBe(PropertyMembershipRole.MANAGER);
    }
  });

  it('creates memberships across multiple properties and skips already claimed ones', () => {
    const plan = planMembershipBackfill(
      [
        makeProfile({
          ownerships: [
            { propertyId: 10, role: OwnershipRole.OWNER },
            { propertyId: 20, role: OwnershipRole.OWNER },
          ],
          memberships: [{ propertyId: 20, userId: 'user-1', role: PropertyMembershipRole.OWNER }],
        }),
      ],
      [makeUser({})],
    );

    expect(plan.operations.filter((op) => op.type === 'create-membership')).toHaveLength(1);
    expect(plan.membershipsCreated).toBe(1);
    expect(plan.operations.some((op) => op.type === 'claim-invite')).toBe(false);
  });

  it('reports conflicts when ownerProfile references a different user id', () => {
    const plan = planMembershipBackfill(
      [
        makeProfile({
          id: 3,
          email: 'owner@example.com',
          userId: 'user-999',
        }),
      ],
      [makeUser({})],
    );

    expect(plan.operations).toHaveLength(0);
    expect(plan.conflicts).toEqual([
      {
        ownerProfileId: 3,
        email: 'owner@example.com',
        reason: 'OwnerProfile.userId (user-999) does not match User.id (user-1)',
      },
    ]);
  });
});
