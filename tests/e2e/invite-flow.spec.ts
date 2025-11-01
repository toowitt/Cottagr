import { test, expect, type APIRequestContext } from '@playwright/test';
import { generateInviteToken } from '@/lib/auth/inviteTokens';
import { sendOwnerInviteEmail } from '@/server/lib/ownerInviteEmail';
import {
  prisma,
  randomEmail,
  randomString,
  ensureSupabaseUser,
  deleteSupabaseUserByEmail,
  upsertViewerMembership,
  assertUniqueMemberships,
} from './utils';

test.describe('Owner invite flows', () => {
  test.beforeEach(async ({ request }, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chromium') {
      test.skip();
      return;
    }
    await clearMailbox(request);
  });

  test.afterEach(async ({ page, request }) => {
    await page.context().clearCookies();
    await clearMailbox(request);
  });

  test('invite claim is idempotent and links viewer membership', async ({ page, request }) => {
    const email = randomEmail('viewer');
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
        name: randomString('Lakeside Cabin'),
        slug: randomString('cabin'),
        nightlyRate: 25000,
        cleaningFee: 15000,
        minNights: 2,
      },
    });

    const ownerProfile = await prisma.ownerProfile.create({
      data: {
        email,
        firstName: 'Viewer',
        lastName: 'Invitee',
      },
    });

    await upsertViewerMembership(ownerProfile.id, property.id, 'VIEWER');

    const token = generateInviteToken();
    await prisma.invite.create({
      data: {
        propertyId: property.id,
        ownerProfileId: ownerProfile.id,
        token,
        email: email.toLowerCase(),
        role: 'VIEWER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await sendOwnerInviteEmail({
      email,
      propertyId: property.id,
      inviteToken: token,
      propertyName: property.name,
      organizationId: organization.id,
      organizationName: organization.name,
      role: 'VIEWER',
    });

    const supabaseUser = await ensureSupabaseUser(email, password);

    const claimUrl = await extractClaimUrl(request, { token, email });
    expect(claimUrl).toBeTruthy();

    await page.goto(claimUrl!);
    await expect(page.locator('body')).toContainText('Sign in to claim access');

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByLabel(/password/i).press('Enter');

    await expect(page.locator('body')).toContainText(property.name, { timeout: 20_000 });

    const membership = await prisma.membership.findFirst({
      where: {
        ownerProfileId: ownerProfile.id,
        propertyId: property.id,
      },
    });

    expect(membership?.role).toBe('VIEWER');
    expect(membership?.userId).toBe(supabaseUser.id);
    await assertUniqueMemberships(property.id, supabaseUser.id);

    await page.goto(claimUrl!);
    await expect(page.locator('body')).toContainText('Invite already claimed');

    await page.goto('/logout');

    await deleteSupabaseUserByEmail(email);
    await prisma.membership.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.invite.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.ownership.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.ownerProfile.delete({ where: { id: ownerProfile.id } });
    await prisma.property.delete({ where: { id: property.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
  });

  test('claiming invites across multiple properties links unique memberships', async ({ page, request }) => {
    const email = randomEmail('multi');
    const password = `P@ss-${randomString('pw')}`;

    const organization = await prisma.organization.create({
      data: {
        name: randomString('Org'),
        slug: randomString('org'),
      },
    });

    const [propertyA, propertyB] = await Promise.all([
      prisma.property.create({
        data: {
          organizationId: organization.id,
          name: randomString('Harbor House'),
          slug: randomString('harbor'),
          nightlyRate: 32000,
          cleaningFee: 18000,
          minNights: 3,
        },
      }),
      prisma.property.create({
        data: {
          organizationId: organization.id,
          name: randomString('Forest Retreat'),
          slug: randomString('forest'),
          nightlyRate: 28000,
          cleaningFee: 16000,
          minNights: 2,
        },
      }),
    ]);

    const ownerProfile = await prisma.ownerProfile.create({
      data: {
        email,
        firstName: 'Multi',
        lastName: 'Owner',
      },
    });

    await upsertViewerMembership(ownerProfile.id, propertyA.id, 'OWNER');
    await upsertViewerMembership(ownerProfile.id, propertyB.id, 'MANAGER');

    const tokenA = generateInviteToken();
    const tokenB = generateInviteToken();

    await prisma.invite.createMany({
      data: [
        {
          propertyId: propertyA.id,
          ownerProfileId: ownerProfile.id,
          token: tokenA,
          email: email.toLowerCase(),
          role: 'OWNER',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          propertyId: propertyB.id,
          ownerProfileId: ownerProfile.id,
          token: tokenB,
          email: email.toLowerCase(),
          role: 'MANAGER',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    await sendOwnerInviteEmail({
      email,
      propertyId: propertyA.id,
      inviteToken: tokenA,
      propertyName: propertyA.name,
      organizationId: organization.id,
      organizationName: organization.name,
      role: 'OWNER',
    });
    await sendOwnerInviteEmail({
      email,
      propertyId: propertyB.id,
      inviteToken: tokenB,
      propertyName: propertyB.name,
      organizationId: organization.id,
      organizationName: organization.name,
      role: 'MANAGER',
    });

    const supabaseUser = await ensureSupabaseUser(email, password);

    const claimUrl = await extractClaimUrl(request, { token: tokenA, email });
    await page.goto(claimUrl!);
    await expect(page.locator('body')).toContainText('Sign in to claim access');

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByLabel(/password/i).press('Enter');

    await expect(page.locator('body')).toContainText(propertyA.name, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(propertyB.name);

    const memberships = await prisma.membership.findMany({
      where: {
        ownerProfileId: ownerProfile.id,
        propertyId: { in: [propertyA.id, propertyB.id] },
      },
    });

    expect(memberships).toHaveLength(2);
    expect(new Set(memberships.map((m) => m.propertyId))).toEqual(new Set([propertyA.id, propertyB.id]));
    expect(new Set(memberships.map((m) => m.role))).toEqual(new Set(['OWNER', 'MANAGER']));
    for (const membership of memberships) {
      expect(membership.userId).toBe(supabaseUser.id);
      await assertUniqueMemberships(membership.propertyId, membership.userId!);
    }

    await page.goto('/logout');

    await deleteSupabaseUserByEmail(email);
    await prisma.membership.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.invite.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.ownership.deleteMany({ where: { ownerProfileId: ownerProfile.id } });
    await prisma.ownerProfile.delete({ where: { id: ownerProfile.id } });
    await prisma.property.deleteMany({ where: { id: { in: [propertyA.id, propertyB.id] } } });
    await prisma.organization.delete({ where: { id: organization.id } });
  });

  test('organization admin add-me-as-manager provisions manager membership only', async ({ page }) => {
    const email = randomEmail('admin');
    const password = `P@ss-${randomString('pw')}`;

    const supabaseUser = await ensureSupabaseUser(email, password);

    const organization = await prisma.organization.create({
      data: {
        name: randomString('Org'),
        slug: randomString('org'),
      },
    });

    await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: supabaseUser.id,
        role: 'OWNER_ADMIN',
      },
    });

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByLabel(/password/i).press('Enter');

    const propertyName = randomString('Manager Cottage');

    await page.request.post('/api/test-setup/create-property', {
      data: {
        organizationId: organization.id,
        name: propertyName,
        slug: randomString('manager-cottage'),
        location: 'Testville',
        beds: 3,
        baths: 2,
        nightlyRate: 30000,
        cleaningFee: 12000,
        minNights: 2,
        description: 'Autogenerated for manager toggle test.',
        addManager: true,
      },
    });

    await page.goto('/admin/setup');
    await expect(page.locator('body')).toContainText(propertyName);

    const property = await prisma.property.findFirstOrThrow({
      where: { name: propertyName },
    });

    const membership = await prisma.membership.findFirst({
      where: {
        propertyId: property.id,
        userId: supabaseUser.id,
      },
    });

    expect(membership?.role).toBe('MANAGER');
    await assertUniqueMemberships(property.id, supabaseUser.id);

    const ownerProfile = await prisma.ownerProfile.findUnique({ where: { email } });
    expect(ownerProfile).toBeTruthy();
    const ownershipCount = ownerProfile
      ? await prisma.ownership.count({ where: { ownerProfileId: ownerProfile.id, propertyId: property.id } })
      : 0;
    expect(ownershipCount).toBe(0);

    await page.goto('/logout');

    await deleteSupabaseUserByEmail(email);
    await prisma.membership.deleteMany({ where: { propertyId: property.id } });
    await prisma.invite.deleteMany({ where: { propertyId: property.id } });
    if (ownerProfile) {
      await prisma.ownerProfile.delete({ where: { id: ownerProfile.id } });
    }
    await prisma.property.delete({ where: { id: property.id } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId: organization.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
  });
});

async function extractClaimUrl(
  request: APIRequestContext,
  { token, email }: { token: string; email: string },
) {
  const deadline = Date.now() + 8000;
  const lowerEmail = email.toLowerCase();

  while (Date.now() < deadline) {
    const latest = await request.get('/api/test-mailbox/last');
    if (latest.ok()) {
      const payload = (await latest.json()) as
        | { message?: { metadata?: Record<string, unknown>; to?: string } }
        | undefined
        | null;
      const candidate = (payload?.message ?? {}) as { metadata?: Record<string, unknown>; to?: string };
      const messageToken =
        typeof candidate.metadata?.inviteToken === 'string' ? candidate.metadata.inviteToken : null;
      const messageEmail =
        typeof candidate.metadata?.to === 'string'
          ? candidate.metadata.to.toLowerCase()
          : typeof candidate.to === 'string'
            ? candidate.to.toLowerCase()
            : null;
      if (messageToken === token || messageEmail === lowerEmail) {
        const claimUrl = candidate.metadata?.claimUrl;
        if (typeof claimUrl === 'string' && claimUrl.length > 0) {
          return claimUrl;
        }
      }
    }

    const response = await request.get('/api/test-mailbox');
    if (response.ok()) {
      const { messages } = (await response.json()) as {
        messages?: Array<{ metadata?: Record<string, unknown>; to?: string }>;
      };

      if (messages?.length) {
        const match = messages.find((message) => {
          const messageToken = typeof message.metadata?.inviteToken === 'string' ? message.metadata.inviteToken : null;
          const messageEmail =
            typeof message.metadata?.to === 'string'
              ? message.metadata.to.toLowerCase()
              : typeof message.to === 'string'
                ? message.to.toLowerCase()
                : null;
          return messageToken === token || messageEmail === lowerEmail;
        });

        const claimUrl = match?.metadata?.claimUrl;
        if (typeof claimUrl === 'string' && claimUrl.length > 0) {
          return claimUrl;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return undefined;
}

async function clearMailbox(request: APIRequestContext) {
  const response = await request.delete('/api/test-mailbox');
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to clear test mailbox: ${response.status()} - ${response.statusText()}`);
  }
}
