import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Session, User } from '@supabase/supabase-js';

const TEST_AUTH_COOKIE = 'test-auth-user';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type TestAuthPayload = {
  id: string;
  email: string;
};

const encodePayload = (payload: TestAuthPayload) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

const decodePayload = (raw: string | undefined | null): TestAuthPayload | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as TestAuthPayload;
  } catch (error) {
    console.error('Failed to decode test auth cookie payload', error);
    return null;
  }
};

export const setTestAuthCookie = (response: NextResponse, payload: TestAuthPayload) => {
  response.cookies.set(TEST_AUTH_COOKIE, encodePayload(payload), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  });
};

export const clearTestAuthCookie = (response: NextResponse) => {
  response.cookies.set(TEST_AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
};

const readCookiePayload = async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(TEST_AUTH_COOKIE)?.value;
  return decodePayload(cookieValue);
};

const toSupabaseUser = (user: { id: string; email: string; firstName: string | null; lastName: string | null }): User => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  return {
    id: user.id,
    app_metadata: { provider: 'test', providers: ['test'] },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: user.email,
    phone: undefined,
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    user_metadata: {
      full_name: fullName,
      first_name: user.firstName,
      last_name: user.lastName,
    },
    identities: [],
    factors: [],
  } as unknown as User;
};

const buildSession = (user: User): Session => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

export const getTestAuthUser = async () => {
  const payload = await readCookiePayload();
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) {
    return null;
  }

  return toSupabaseUser(user);
};

export const createTestSupabaseClient = async () => ({
  auth: {
    getUser: async () => {
      const user = await getTestAuthUser();
      return { data: { user }, error: null };
    },
    getSession: async () => {
      const user = await getTestAuthUser();
      return {
        data: {
          session: user ? buildSession(user) : null,
        },
        error: null,
      };
    },
    exchangeCodeForSession: async () => ({
      data: { session: null },
      error: null,
    }),
    signOut: async () => {
      const cookieStore = await cookies();
      cookieStore.delete(TEST_AUTH_COOKIE);
      return { error: null };
    },
  },
});

export const isTestAuthEnabled = () => process.env.ENABLE_TEST_AUTH === 'true';
