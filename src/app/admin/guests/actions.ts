'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabaseActionClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { getUserMemberships } from '@/lib/auth/getMemberships';
import { prisma } from '@/lib/prisma';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const inviteSchema = z.object({
  propertyId: z.coerce.number().int().positive().optional(),
  email: z.string().email('Valid email required'),
  name: z.string().max(200).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

function resolveAllowedOrganizationIds(
  memberships: Array<{ organizationId: number; role: 'OWNER_ADMIN' | 'OWNER' | 'GUEST_VIEWER' }>,
) {
  return new Set(memberships.filter((item) => item.role === 'OWNER_ADMIN').map((item) => item.organizationId));
}

export async function sendGuestInvite(formData: FormData) {
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/guests');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/guests');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const allowedOrgIds = resolveAllowedOrganizationIds(memberships);
  if (allowedOrgIds.size === 0) {
    redirect('/admin/guests?error=You%20do%20not%20have%20permission%20to%20send%20invites');
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

  let propertyId: number | null = null;
  if (parsed.data.propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: parsed.data.propertyId },
      select: { id: true, organizationId: true, name: true },
    });

    if (!property) {
      redirect('/admin/guests?error=Property%20not%20found');
    }

    if (!property.organizationId || !allowedOrgIds.has(property.organizationId)) {
      redirect('/admin/guests?error=You%20do%20not%20manage%20that%20property');
    }

    propertyId = property.id;
  }

  const serviceClient = createSupabaseServiceClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: parsed.data.email,
    options: {
      redirectTo: `${siteUrl}/login`,
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
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  if (!user) {
    redirect('/login?redirect=/admin/guests');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    redirect('/login?redirect=/admin/guests');
  }

  const memberships = await getUserMemberships(userRecord.id);
  const allowedOrgIds = resolveAllowedOrganizationIds(memberships);
  if (allowedOrgIds.size === 0) {
    redirect('/admin/guests?error=No%20access');
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

  if (invite.property?.organizationId && !allowedOrgIds.has(invite.property.organizationId)) {
    redirect('/admin/guests?error=You%20cannot%20modify%20that%20invite');
  }

  await prisma.guestInvite.update({
    where: { id: inviteId },
    data: { consumedAt: new Date() },
  });

  revalidatePath('/admin/guests');
  redirect('/admin/guests?success=invite-archived');
}
