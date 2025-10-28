import { prisma } from '@/lib/prisma';
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

export async function ensureUserRecord(authUser: User | null | undefined) {
  if (!authUser) {
    return null;
  }

  if (!authUser.email) {
    throw new Error('Authenticated Supabase user is missing an email address.');
  }

  const name = parseName(authUser.user_metadata);
  const providedFirstName = name.firstName?.trim();
  const providedLastName = name.lastName?.trim();
  const fallbackFirstName =
    authUser.email.split('@')[0]?.replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'Owner';

  let user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      memberships: true,
      owners: true,
    },
  });

  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email: authUser.email },
      include: {
        memberships: true,
        owners: true,
      },
    });

    if (byEmail) {
      user = await prisma.user.update({
        where: { email: authUser.email },
        data: {
          id: authUser.id,
          email: authUser.email,
          firstName: name.firstName ?? undefined,
          lastName: name.lastName ?? undefined,
        },
        include: {
          memberships: true,
          owners: true,
        },
      });
    }
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        email: authUser.email,
        firstName: name.firstName ?? undefined,
        lastName: name.lastName ?? undefined,
      },
      include: {
        memberships: true,
        owners: true,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email,
        firstName: name.firstName ?? null,
        lastName: name.lastName ?? null,
      },
      include: {
        memberships: true,
        owners: true,
      },
    });
  }

  const existingOwner = await prisma.owner.findUnique({
    where: { email: authUser.email },
  });

  if (existingOwner) {
    const resolvedFirstName = providedFirstName || existingOwner.firstName || fallbackFirstName;
    const resolvedLastName = providedLastName ?? existingOwner.lastName ?? null;
    await prisma.owner.update({
      where: { id: existingOwner.id },
      data: {
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        userId: authUser.id,
      },
    });
  } else {
    const resolvedFirstName = providedFirstName || fallbackFirstName;
    const resolvedLastName = providedLastName ?? null;
    await prisma.owner.create({
      data: {
        email: authUser.email,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        userId: authUser.id,
      },
    });
  }

  return user;
}
