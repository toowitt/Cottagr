import { cookies } from 'next/headers';
import {
  createServerComponentClient,
  createServerActionClient,
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs';

const withCookieStore = async () => {
  const cookieStore = await cookies();
  return {
    cookies: () => cookieStore,
  };
};

export const createServerSupabaseClient = async () =>
  createServerComponentClient(await withCookieStore());

export const createServerSupabaseActionClient = async () =>
  createServerActionClient(await withCookieStore());

export const createRouteSupabaseClient = async () =>
  createRouteHandlerClient(await withCookieStore());
