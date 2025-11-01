import { test, expect } from '@playwright/test';
import {
  prisma,
  randomEmail,
  randomString,
  ensureSupabaseUser,
  deleteSupabaseUserByEmail,
  assertUniqueMemberships,
} from './utils';
import { sendOwnerInviteEmail } from '@/server/lib/ownerInviteEmail';

const FEATURE_SIGNED = process.env.FEATURE_SIGNED_INVITES === 'true';
const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET;

const skipReason = !FEATURE_SIGNED
  ? 'FEATURE_SIGNED_INVITES flag disabled'
  : !INVITE_SECRET
    ? 'INVITE_TOKEN_SECRET not configured'
    : null;

test.describe('Signed invite claim flow', () => {
  test.beforeEach(async ({ request }, testInfo) => {
    if (skipReason) {
      test.skip(true, skipReason);
    }
    if (testInfo.project.name !== 'Desktop Chromium') {
      test.skip(true, 'Validated on Desktop Chromium only');
    }
    await request.delete('/api/test-mailbox').catch(() => {});
  });

  test.afterEach(async ({ page, request }) => {
    await page.context().clearCookies();
    await request.delete('/api/test-mailbox').catch(() => {});
  });

  test('verifies signed invite token handling', async ({ request }) => {
    const email = randomEmail('signed');
    const password = `P@ss-${randomString('pw')}`;

    const organization = await prisma.organization.create({
      data: {
        name: randomString('Org'),
        slug: randomString('org'),
      },
    });

    const property = await prisma.property.create({
      data: {
        organizationId: organization.id,
        name: randomString('Signature Cabin'),
        slug: randomString('signature-cabin'),
        nightlyRate: 25000,
        cleaningFee: 15000,
        minNights: 2,
      },
    });

    const ownerProfile = await prisma.ownerProfile.create({
      data: {
        email,
        firstName: 'Signed',
        lastName: 'Invitee',
      },
    });

    const invite = await prisma.invite.create({
      data: {
        propertyId: property.id,
        ownerProfileId: ownerProfile.id,
        token: randomString('token').replace(/[^a-zA-Z0-9]/g, ''),
        email,
        role: 'VIEWER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await sendOwnerInviteEmail({
      email,
      propertyId: property.id,
      propertyName: property.name,
      organizationId: organization.id,
      organizationName: organization.name,
      inviteToken: invite.token,
      role: 'VIEWER',
    });

    const latest = await request.get('/api/test-mailbox/last');
    expect(latest.ok()).toBeTruthy();
    const { message } = (await latest.json()) as {
      message?: { metadata?: Record<string, unknown>; html?: string };
    };
    expect(message?.metadata?.tokenSigned).toBeTruthy();
    const claimUrl = message?.metadata?.claimUrl as string;
    expect(claimUrl).toContain('tokenSigned=');

    const tamperedUrl = new URL(claimUrl);
    const originalToken = tamperedUrl.searchParams.get('tokenSigned') ?? '';
    expect(originalToken.length).toBeGreaterThan(0);
    const tamperedToken = `${originalToken.slice(0, -1)}$`;
    const tamperedResponse = await request.post(
      `/api/invites/claim?tokenSigned=${tamperedToken}`,
    );
    expect(tamperedResponse.status()).toBe(401);

    const supabaseUser = await ensureSupabaseUser(email, password);

    const claimResponse = await request.post(
      `/api/invites/claim?tokenSigned=${encodeURIComponent(originalToken)}`,
    );
    expect(claimResponse.status()).toBe(200);
    const claimJson = (await claimResponse.json()) as {
      alreadyClaimed?: boolean;
      tokenType?: string;
    };
    expect(claimJson.alreadyClaimed).toBe(false);
    expect(claimJson.tokenType).toBe('signed');

    const secondResponse = await request.post(
      `/api/invites/claim?tokenSigned=${encodeURIComponent(originalToken)}`,
    );
    expect(secondResponse.status()).toBe(200);
    const secondJson = (await secondResponse.json()) as {
      alreadyClaimed?: boolean;
    };
    expect(secondJson.alreadyClaimed).toBe(true);

    const membership = await prisma.membership.findFirst({
      where: {
        ownerProfileId: ownerProfile.id,
        propertyId: property.id,
      },
    });
    expect(membership?.userId).toBe(supabaseUser.id);
    await assertUniqueMemberships(property.id, supabaseUser.id);

    await deleteSupabaseUserByEmail(email);
    await prisma.membership.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.invite.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.ownership.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.ownerProfile.delete({ where: { id: ownerProfile.id } });
    await prisma.property.delete({ where: { id: property.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
  });
});
