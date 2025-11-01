import { InviteStatus, OwnershipRole, PropertyMembershipRole, Prisma } from '@prisma/client';

export type BackfillUser = {
  id: string;
  email: string;
};

export type BackfillOwnership = {
  propertyId: number;
  role: OwnershipRole;
};

export type BackfillMembership = {
  propertyId: number;
  userId: string | null;
  role: PropertyMembershipRole;
};

export type BackfillInvite = {
  id: number;
  propertyId: number;
  status: InviteStatus;
  role: PropertyMembershipRole;
};

export type BackfillOwnerProfile = {
  id: number;
  email: string;
  userId: string | null;
  ownerships: BackfillOwnership[];
  memberships: BackfillMembership[];
  invites: BackfillInvite[];
};

export type BackfillOperation =
  | { type: 'link-owner'; ownerProfileId: number; userId: string }
  | {
      type: 'create-membership';
      ownerProfileId: number;
      propertyId: number;
      userId: string;
      role: PropertyMembershipRole;
    }
  | { type: 'claim-invite'; inviteId: number; userId: string };

export type BackfillConflict = {
  ownerProfileId: number;
  email: string;
  reason: string;
};

export type BackfillPlan = {
  operations: BackfillOperation[];
  conflicts: BackfillConflict[];
  linkedProfiles: number;
  membershipsCreated: number;
  invitesClaimed: number;
};

const ownershipRoleToMembershipRole = (role: OwnershipRole): PropertyMembershipRole => {
  switch (role) {
    case OwnershipRole.CARETAKER:
      return PropertyMembershipRole.MANAGER;
    default:
      return PropertyMembershipRole.OWNER;
  }
};

export const describeBackfillOperation = (operation: BackfillOperation) => {
  switch (operation.type) {
    case 'link-owner':
      return `Link ownerProfile#${operation.ownerProfileId} → user ${operation.userId}`;
    case 'create-membership':
      return `Create membership (ownerProfile#${operation.ownerProfileId} → property#${operation.propertyId}) as ${operation.role}`;
    case 'claim-invite':
      return `Mark invite#${operation.inviteId} as CLAIMED`;
    default:
      return 'Unknown operation';
  }
};

export function planMembershipBackfill(
  ownerProfiles: BackfillOwnerProfile[],
  users: BackfillUser[],
): BackfillPlan {
  const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const operations: BackfillOperation[] = [];
  const conflicts: BackfillConflict[] = [];

  let linkedProfiles = 0;
  let membershipsCreated = 0;
  let invitesClaimed = 0;

  for (const profile of ownerProfiles) {
    const matchingUser = usersByEmail.get(profile.email.toLowerCase());

    if (!matchingUser) {
      continue;
    }

    if (profile.userId && profile.userId !== matchingUser.id) {
      conflicts.push({
        ownerProfileId: profile.id,
        email: profile.email,
        reason: `OwnerProfile.userId (${profile.userId}) does not match User.id (${matchingUser.id})`,
      });
      continue;
    }

    if (!profile.userId) {
      operations.push({ type: 'link-owner', ownerProfileId: profile.id, userId: matchingUser.id });
      linkedProfiles += 1;
    }

    const membershipByProperty = new Map(profile.memberships.map((membership) => [membership.propertyId, membership]));
    const claimedProperties = new Set<number>();
    const touchedProperties = new Set<number>();

    for (const ownership of profile.ownerships) {
      claimedProperties.add(ownership.propertyId);

      const existingMembership = membershipByProperty.get(ownership.propertyId);
      const desiredRole = existingMembership?.role ?? ownershipRoleToMembershipRole(ownership.role);
      if (existingMembership && existingMembership.userId === matchingUser.id && existingMembership.role === desiredRole) {
        continue;
      }
      operations.push({
        type: 'create-membership',
        ownerProfileId: profile.id,
        propertyId: ownership.propertyId,
        userId: matchingUser.id,
        role: desiredRole,
      });
      membershipsCreated += 1;
      touchedProperties.add(ownership.propertyId);
      membershipByProperty.set(ownership.propertyId, {
        propertyId: ownership.propertyId,
        role: desiredRole,
        userId: matchingUser.id,
      });
    }

    for (const membership of profile.memberships) {
      claimedProperties.add(membership.propertyId);
      if (touchedProperties.has(membership.propertyId)) {
        continue;
      }
      if (membership.userId === matchingUser.id) {
        continue;
      }
      operations.push({
        type: 'create-membership',
        ownerProfileId: profile.id,
        propertyId: membership.propertyId,
        userId: matchingUser.id,
        role: membership.role,
      });
      membershipsCreated += 1;
      touchedProperties.add(membership.propertyId);
      membershipByProperty.set(membership.propertyId, {
        propertyId: membership.propertyId,
        role: membership.role,
        userId: matchingUser.id,
      });
    }

    for (const invite of profile.invites) {
      if (invite.status !== InviteStatus.PENDING) {
        continue;
      }

      claimedProperties.add(invite.propertyId);

      if (!touchedProperties.has(invite.propertyId)) {
        const existingMembership = membershipByProperty.get(invite.propertyId);
        if (
          !existingMembership ||
          existingMembership.userId !== matchingUser.id ||
          existingMembership.role !== invite.role
        ) {
          operations.push({
            type: 'create-membership',
            ownerProfileId: profile.id,
            propertyId: invite.propertyId,
            userId: matchingUser.id,
            role: invite.role,
          });
          membershipsCreated += 1;
          touchedProperties.add(invite.propertyId);
          membershipByProperty.set(invite.propertyId, {
            propertyId: invite.propertyId,
            role: invite.role,
            userId: matchingUser.id,
          });
        }
      }

      operations.push({ type: 'claim-invite', inviteId: invite.id, userId: matchingUser.id });
      invitesClaimed += 1;
    }
  }

  return {
    operations,
    conflicts,
    linkedProfiles,
    membershipsCreated,
    invitesClaimed,
  };
}

export async function applyBackfillOperations(
  tx: Prisma.TransactionClient,
  operations: BackfillOperation[],
  now = new Date(),
) {
  for (const operation of operations) {
    if (operation.type === 'link-owner') {
      await tx.ownerProfile.update({
        where: { id: operation.ownerProfileId },
        data: { userId: operation.userId },
      });
    } else if (operation.type === 'create-membership') {
      await tx.membership.upsert({
        where: {
          ownerProfileId_propertyId: {
            ownerProfileId: operation.ownerProfileId,
            propertyId: operation.propertyId,
          },
        },
        update: {
          userId: operation.userId,
          role: operation.role,
        },
        create: {
          ownerProfileId: operation.ownerProfileId,
          propertyId: operation.propertyId,
          userId: operation.userId,
          role: operation.role,
        },
      });
    } else if (operation.type === 'claim-invite') {
      await tx.invite.update({
        where: { id: operation.inviteId },
        data: {
          status: InviteStatus.CLAIMED,
          claimedAt: now,
          claimedById: operation.userId,
        },
      });
    }
  }
}
