import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthApiError, AuthError, AuthSessionMissingError } from '@supabase/supabase-js';
import {
  createServerComponentClient,
  createServerActionClient,
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const withCookieStore = async () => {
  const cookieStore = await cookies();
  return {
    cookies: () => cookieStore,
  } as unknown as {
    cookies: () => Promise<CookieStore>;
  };
};

export const createServerSupabaseClient = async () =>
  createServerComponentClient(await withCookieStore());

export const createServerSupabaseActionClient = async () =>
  createServerActionClient(await withCookieStore());

export const createRouteSupabaseClient = async () =>
  createRouteHandlerClient(await withCookieStore());

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
