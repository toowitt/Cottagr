import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { isTestAuthEnabled, setTestAuthCookie } from '@/server/lib/testAuth';

export async function POST(request: Request) {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: 'Not enabled' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const userId = existingUser?.id ?? crypto.randomUUID();

  const [providedFirstName, ...providedRest] = name.split(' ').filter(Boolean);
  const providedLastName = providedRest.length > 0 ? providedRest.join(' ') : null;
  const resolvedFirstName = existingUser?.firstName ?? providedFirstName ?? null;
  const resolvedLastName = existingUser?.lastName ?? providedLastName ?? null;
  const resolvedFullName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ') || null;

  const supabaseUser: User = {
    id: userId,
    email,
    user_metadata: {
      full_name: resolvedFullName,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
    },
    app_metadata: { provider: 'test', providers: ['test'] },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    identities: [],
    factors: [],
    role: 'authenticated',
  } as User;

  await ensureUserRecord(supabaseUser);

  const response = NextResponse.json({ ok: true });
  setTestAuthCookie(response, { id: userId, email });
  return response;
}
