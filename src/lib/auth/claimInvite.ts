import { prisma } from '@/lib/prisma';
import { InviteStatus } from '@prisma/client';
import { membershipSelect, type PropertyMembershipWithRelations } from './propertyMembership';

export class InviteClaimError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ClaimInviteResult = {
  membership: PropertyMembershipWithRelations;
  alreadyClaimed: boolean;
};

export async function claimInviteByToken(token: string, userId: string, email: string) {
  if (!token.trim()) {
    throw new InviteClaimError('Token is required', 400);
  }

  if (!email.trim()) {
    throw new InviteClaimError('Email is required', 400);
  }

  const normalizedEmail = email.toLowerCase();

  return prisma.$transaction<ClaimInviteResult>(async (tx) => {
    const invite = await tx.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new InviteClaimError('Invite not found', 404);
    }

    if (invite.email.toLowerCase() !== normalizedEmail) {
      throw new InviteClaimError('Invite does not belong to the current user', 403);
    }

    if (invite.status === InviteStatus.REVOKED) {
      throw new InviteClaimError('Invite has been revoked', 410);
    }

    if (invite.status === InviteStatus.CLAIMED && invite.claimedById && invite.claimedById !== userId) {
      throw new InviteClaimError('Invite already claimed by another user', 409);
    }

    const membership = await tx.membership.upsert({
      where: {
        ownerProfileId_propertyId: {
          ownerProfileId: invite.ownerProfileId,
          propertyId: invite.propertyId,
        },
      },
      update: {
        userId,
        role: invite.role,
      },
      create: {
        ownerProfileId: invite.ownerProfileId,
        propertyId: invite.propertyId,
        userId,
        role: invite.role,
      },
      select: membershipSelect,
    });

    const alreadyClaimed = invite.status === InviteStatus.CLAIMED && invite.claimedById === userId;

    if (!alreadyClaimed) {
      await tx.invite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.CLAIMED,
          claimedAt: invite.claimedAt ?? new Date(),
          claimedById: userId,
        },
      });
    }

    return { membership, alreadyClaimed };
  });
}
