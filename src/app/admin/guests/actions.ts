'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { APP_URL } from '@/lib/auth/config';
import { getActionUserRecord, ensureActionPropertyMembership, ActionAuthError } from '@/lib/auth/actionAuth';
import { isManagerRole } from '@/lib/auth/capabilities';
import type { PropertyMembershipRole } from '@prisma/client';

const inviteSchema = z.object({
  propertyId: z.coerce.number().int().positive().optional(),
  email: z.string().email('Valid email required'),
  name: z.string().max(200).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export async function sendGuestInvite(formData: FormData) {
  let userRecord;
  try {
    userRecord = await getActionUserRecord();
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect('/login?redirect=/admin/guests');
    }
    throw error;
  }

  const parsed = inviteSchema.safeParse({
    propertyId: (() => {
      const raw = formData.get('propertyId');
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return Number(raw);
      }
      return undefined;
    })(),
    email: formData.get('email'),
    name: formData.get('name'),
    expiresInDays: formData.get('expiresInDays'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message ?? 'Invalid invite';
    redirect(`/admin/guests?error=${encodeURIComponent(msg)}`);
  }

  const memberships = userRecord.memberships ?? [];
  const manageablePropertyIds = memberships
    .filter((membership) => isManagerRole(membership.role as PropertyMembershipRole))
    .map((membership) => membership.propertyId);

  let propertyId: number | null = null;
  if (parsed.data.propertyId) {
    try {
      const membership = await ensureActionPropertyMembership(parsed.data.propertyId);
      if (!isManagerRole(membership.role)) {
        throw new ActionAuthError('Forbidden', 403);
      }
      propertyId = membership.propertyId;
    } catch (error) {
      if (error instanceof ActionAuthError) {
        redirect(`/admin/guests?error=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
  } else if (manageablePropertyIds.length === 0) {
    redirect('/admin/guests?error=No%20eligible%20properties');
  }

  const serviceClient = createSupabaseServiceClient();
  const inviteRedirectUrl = new URL('/login', APP_URL).toString();

  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: parsed.data.email,
    options: {
      redirectTo: inviteRedirectUrl,
    },
  });

  const linkProperties = data?.properties ?? null;
  const actionLink = linkProperties?.action_link ?? null;
  const linkPropertiesWithExpiry = linkProperties as (Record<string, unknown> & { expires_at?: string | null }) | null;
  const linkExpiryIso =
    typeof linkPropertiesWithExpiry?.expires_at === 'string' ? linkPropertiesWithExpiry.expires_at : null;

  if (error || !actionLink) {
    console.error('Guest invite magic link generation failed', { error, data });
    const reason = error?.message ?? 'Unable to generate magic link';
    redirect(`/admin/guests?error=${encodeURIComponent(reason)}`);
  }

  const now = new Date();
  const expiryFromSupabase = linkExpiryIso ? new Date(linkExpiryIso) : null;
  // If Supabase returns very short expiry, override with requested window
  const requestedExpiry = new Date(now.getTime() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  const expiresAt = expiryFromSupabase && expiryFromSupabase > now ? expiryFromSupabase : requestedExpiry;

  await prisma.guestInvite.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      actionLink,
      expiresAt,
      propertyId,
      invitedByOwnershipId: null,
    },
  });

  revalidatePath('/admin/guests');
  redirect('/admin/guests?success=invite-sent');
}

export async function markInviteConsumed(inviteId: number) {
  try {
    await getActionUserRecord();
  } catch (error) {
    if (error instanceof ActionAuthError) {
      redirect('/login?redirect=/admin/guests');
    }
    throw error;
  }

  const invite = await prisma.guestInvite.findUnique({
    where: { id: inviteId },
    include: {
      property: true,
    },
  });

  if (!invite) {
    redirect('/admin/guests?error=Invite%20not%20found');
  }

  if (invite.propertyId) {
    try {
      const membership = await ensureActionPropertyMembership(invite.propertyId);
      if (!isManagerRole(membership.role)) {
        throw new ActionAuthError('Forbidden', 403);
      }
    } catch (error) {
      if (error instanceof ActionAuthError) {
        redirect(`/admin/guests?error=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
  }

  await prisma.guestInvite.update({
    where: { id: inviteId },
    data: { consumedAt: new Date() },
  });

  revalidatePath('/admin/guests');
  redirect('/admin/guests?success=invite-archived');
}
