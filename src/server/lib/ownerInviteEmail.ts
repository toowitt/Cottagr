import { APP_URL } from '@/lib/auth/config';
import type { PropertyMembershipRole } from '@prisma/client';
import { sendMail, pushTestMail } from './mailer';
import { signInvite } from './invites/signing';

type OwnerInviteEmailParams = {
  email: string;
  propertyId: number;
  propertyName: string;
  organizationId?: number | null;
  organizationName?: string | null;
  inviteToken: string;
  role: PropertyMembershipRole;
};

export async function sendOwnerInviteEmail({
  email,
  propertyId,
  propertyName,
  organizationId,
  organizationName,
  inviteToken,
  role,
}: OwnerInviteEmailParams) {
  const useSignedInvites = process.env.FEATURE_SIGNED_INVITES === 'true';
  const legacyClaimUrl = new URL(`/invite/claim?token=${inviteToken}`, APP_URL).toString();

  let claimUrl = legacyClaimUrl;
  let tokenSigned: string | null = null;

  if (useSignedInvites) {
    const secret = process.env.INVITE_TOKEN_SECRET;
    if (!secret) {
      throw new Error('INVITE_TOKEN_SECRET must be set when FEATURE_SIGNED_INVITES=true');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 60 * 60 * 24;

    tokenSigned = signInvite(
      {
        kind: 'invite',
        sub: email.toLowerCase(),
        propertyId,
        role,
        iat: issuedAt,
        exp: expiresAt,
        nonce: inviteToken,
      },
      secret,
    );

    claimUrl = new URL(`/invite/claim?tokenSigned=${encodeURIComponent(tokenSigned)}`, APP_URL).toString();
  }
  const subject = `You're invited to ${propertyName} on Cottagr`;
  const roleLabel = role.toLowerCase();
  const orgCopy = organizationName ? ` for ${organizationName}` : '';

  const text = [
    `You've been invited to join ${propertyName}${orgCopy} on Cottagr as a ${roleLabel}.`,
    '',
    `Claim your access: ${claimUrl}`,
    '',
    'If you did not expect this invite, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>You've been invited to join <strong>${propertyName}</strong>${orgCopy} on Cottagr as a <strong>${roleLabel}</strong>.</p>
    <p><a href="${claimUrl}">Claim your access</a></p>
    <p>If you did not expect this invite, you can ignore this email.</p>
  `;

  pushTestMail(email, inviteToken, {
    subject,
    text,
    html,
    metadata: {
      claimUrl,
      claimUrlLegacy: legacyClaimUrl,
      propertyId,
      organizationId: organizationId ?? null,
      propertyName,
      organizationName,
      role,
      inviteToken,
      tokenSigned,
    },
  });

  await sendMail({
    to: email,
    subject,
    text,
    html,
    metadata: {
      claimUrl,
      claimUrlLegacy: legacyClaimUrl,
      propertyId,
      organizationId: organizationId ?? null,
      propertyName,
      organizationName,
      role,
      inviteToken,
      tokenSigned,
    },
  });
}
