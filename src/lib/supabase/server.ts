import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthApiError, AuthError, AuthSessionMissingError } from '@supabase/supabase-js';
import {
  createServerComponentClient,
  createServerActionClient,
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs';
import { AUTH_COOKIE_DOMAIN, AUTH_COOKIE_OPTIONS } from '@/lib/auth/config';
import { createTestSupabaseClient, isTestAuthEnabled } from '@/server/lib/testAuth';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const withCookieStore = async () => {
  const cookieStore = await cookies();
  return {
    cookies: () => cookieStore,
  } as unknown as {
    cookies: () => Promise<CookieStore>;
  };
};

const cookieOptions = {
  ...AUTH_COOKIE_OPTIONS,
  ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
  path: '/',
} as const;

export const createServerSupabaseClient = async () => {
  if (isTestAuthEnabled()) {
    return createTestSupabaseClient();
  }
  return createServerComponentClient(await withCookieStore(), { cookieOptions });
};

export const createServerSupabaseActionClient = async () => {
  if (isTestAuthEnabled()) {
    return createTestSupabaseClient();
  }
  return createServerActionClient(await withCookieStore(), { cookieOptions });
};

export const createRouteSupabaseClient = async () => {
  if (isTestAuthEnabled()) {
    return createTestSupabaseClient();
  }
  return createRouteHandlerClient(await withCookieStore(), { cookieOptions });
};

const isInvalidRefreshTokenError = (error: AuthApiError) =>
  error.code === 'refresh_token_not_found' || error.code === 'session_not_found';

const isMissingSessionError = (error: AuthError) => error.message === 'Auth session missing!';

export const handleSupabaseAuthError = (error: unknown) => {
  if (!error) {
    return;
  }

  if (error instanceof AuthApiError && isInvalidRefreshTokenError(error)) {
    redirect('/logout');
  }

  if (error instanceof AuthSessionMissingError || (error instanceof AuthError && isMissingSessionError(error))) {
    return;
  }

  throw error;
};
