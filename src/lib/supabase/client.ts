'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AUTH_COOKIE_DOMAIN, AUTH_COOKIE_OPTIONS } from '@/lib/auth/config';

const cookieOptions = {
  ...AUTH_COOKIE_OPTIONS,
  ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
  path: '/',
} as const;

export const createSupabaseBrowserClient = () =>
  createClientComponentClient({ cookieOptions });
