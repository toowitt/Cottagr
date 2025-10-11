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

  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {
      email: authUser.email,
      firstName: name.firstName ?? undefined,
      lastName: name.lastName ?? undefined,
    },
    create: {
      id: authUser.id,
      email: authUser.email,
      firstName: name.firstName,
      lastName: name.lastName,
    },
    include: {
      memberships: true,
      owners: true,
    },
  });

  // Attach existing owner records (if any) to the Supabase user so downstream
  // preference updates can scope correctly.
  await prisma.owner.updateMany({
    where: {
      email: authUser.email,
      OR: [{ userId: null }, { userId: authUser.id }],
    },
    data: { userId: authUser.id },
  });

  return user;
}
