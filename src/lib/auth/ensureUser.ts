import { prisma } from '@/lib/prisma';
import type { User } from '@supabase/supabase-js';
import { planMembershipBackfill, applyBackfillOperations } from './backfill';

type Metadata = Record<string, unknown> | undefined | null;

const parseName = (metadata: Metadata) => {
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : undefined;
  if (fullName) {
    const [first, ...rest] = fullName.split(' ');
    return { firstName: first ?? null, lastName: rest.join(' ') || null };
  }

  const firstName = typeof metadata?.first_name === 'string' ? metadata.first_name.trim() : undefined;
  const lastName = typeof metadata?.last_name === 'string' ? metadata.last_name.trim() : undefined;

  return {
    firstName: firstName ?? null,
    lastName: lastName ?? null,
  };
};

export async function ensureUserRecord(authUser: User | null | undefined) {
  if (!authUser) {
    return null;
  }

  if (!authUser.email) {
    throw new Error('Authenticated Supabase user is missing an email address.');
  }

  const email = authUser.email;
  const name = parseName(authUser.user_metadata);
  const providedFirstName = name.firstName?.trim();
  const providedLastName = name.lastName?.trim();
  const fallbackFirstName =
    email.split('@')[0]?.replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'Owner';

  const user = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { id: authUser.id },
    });

    const userRecord = existingUser
      ? await tx.user.update({
        where: { id: authUser.id },
        data: {
          email,
          firstName: name.firstName ?? undefined,
          lastName: name.lastName ?? undefined,
        },
      })
      : await tx.user.create({
        data: {
          id: authUser.id,
          email,
          firstName: name.firstName ?? null,
          lastName: name.lastName ?? null,
        },
      });

    const ownerProfileInclude = {
      ownerships: {
        select: {
          propertyId: true,
          role: true,
        },
      },
      memberships: {
        select: {
          propertyId: true,
          userId: true,
          role: true,
        },
      },
      invites: {
        where: { status: 'PENDING' },
        select: {
          id: true,
          propertyId: true,
          status: true,
          role: true,
        },
      },
    } as const;

    let ownerProfiles = await tx.ownerProfile.findMany({
      where: { email },
      include: ownerProfileInclude,
    });

    if (ownerProfiles.length === 0) {
      const resolvedFirstName = providedFirstName || fallbackFirstName;
      const resolvedLastName = providedLastName ?? null;
      await tx.ownerProfile.create({
        data: {
          email,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          userId: userRecord.id,
        },
      });
    } else {
      for (const profile of ownerProfiles) {
        const resolvedFirstName = providedFirstName || profile.firstName || fallbackFirstName;
        const resolvedLastName = providedLastName ?? profile.lastName ?? null;

        await tx.ownerProfile.update({
          where: { id: profile.id },
          data: {
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            userId: userRecord.id,
          },
        });
      }
    }

    ownerProfiles = await tx.ownerProfile.findMany({
      where: { email },
      include: ownerProfileInclude,
    });

    if (ownerProfiles.length > 0) {
      const backfillProfiles = ownerProfiles.map((profile) => ({
        id: profile.id,
        email: profile.email,
        userId: profile.userId,
        ownerships: profile.ownerships.map((ownership) => ({
          propertyId: ownership.propertyId,
          role: ownership.role,
        })),
        memberships: profile.memberships.map((membership) => ({
          propertyId: membership.propertyId,
          userId: membership.userId,
          role: membership.role,
        })),
        invites: profile.invites.map((invite) => ({
          id: invite.id,
          propertyId: invite.propertyId,
          status: invite.status,
          role: invite.role,
        })),
      }));

      const plan = planMembershipBackfill(backfillProfiles, [
        {
          id: userRecord.id,
          email,
        },
      ]);

      if (plan.conflicts.length > 0) {
        console.warn('ensureUserRecord conflicts detected', plan.conflicts);
      }

      if (plan.operations.length > 0) {
        await applyBackfillOperations(tx, plan.operations);
      }
    }

    return userRecord;
  });

  const hydratedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      owners: true,
      memberships: {
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
      },
      organizationMemberships: true,
    },
  });

  return hydratedUser;
}
