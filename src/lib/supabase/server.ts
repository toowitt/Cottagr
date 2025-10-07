import { cookies } from 'next/headers';
import {
  createServerComponentClient,
  createServerActionClient,
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs';

export const createServerSupabaseClient = () =>
  createServerComponentClient({ cookies });

export const createServerSupabaseActionClient = () =>
  createServerActionClient({ cookies });

export const createRouteSupabaseClient = () =>
  createRouteHandlerClient({ cookies });
