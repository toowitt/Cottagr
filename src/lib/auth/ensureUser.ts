import { prisma } from '@/lib/prisma';
import { OwnershipRole, PropertyMembershipRole } from '@prisma/client';
import type { User } from '@supabase/supabase-js';

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

const ownershipRoleToMembershipRole = (role: OwnershipRole): PropertyMembershipRole => {
  switch (role) {
    case 'CARETAKER':
      return PropertyMembershipRole.MANAGER;
    default:
      return PropertyMembershipRole.OWNER;
  }
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

    const ownerProfiles = await tx.ownerProfile.findMany({
      where: { email },
      include: {
        ownerships: {
          select: {
            id: true,
            propertyId: true,
            role: true,
          },
        },
      },
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

        // Claim property memberships tied to this owner profile.
        for (const ownership of profile.ownerships) {
          await tx.membership.upsert({
            where: {
              ownerProfileId_propertyId: {
                ownerProfileId: profile.id,
                propertyId: ownership.propertyId,
              },
            },
            update: {
              userId: userRecord.id,
            },
            create: {
              ownerProfileId: profile.id,
              propertyId: ownership.propertyId,
              userId: userRecord.id,
              role: ownershipRoleToMembershipRole(ownership.role),
            },
          });
        }

        await tx.invite.updateMany({
          where: {
            ownerProfileId: profile.id,
            status: 'PENDING',
          },
          data: {
            status: 'CLAIMED',
            claimedAt: new Date(),
          },
        });
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
