import { NextResponse } from 'next/server';
import { AuthSessionMissingError } from '@supabase/supabase-js';
import { createRouteSupabaseClient } from '@/lib/supabase/server';
import { APP_URL, AUTH_COOKIE_DOMAIN, AUTH_COOKIE_OPTIONS } from '@/lib/auth/config';

const buildRedirect = () => {
  const redirectUrl = new URL('/login', APP_URL);
  redirectUrl.searchParams.set('message', 'signed-out');
  return redirectUrl;
};

const signOutHandler = async () => {
  const supabase = await createRouteSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error && !(error instanceof AuthSessionMissingError)) {
    console.error('Supabase sign out failed', error);
  }
  const response = NextResponse.redirect(buildRedirect(), { status: 303 });
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0];
  const supabaseCookieName = projectRef ? `sb-${projectRef}-auth-token` : 'sb-auth-token';

  const cookieOptions = {
    ...AUTH_COOKIE_OPTIONS,
    ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
    path: '/',
  } as const;

  response.cookies.set('auth', '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(supabaseCookieName, '', { ...cookieOptions, maxAge: 0 });
  return response;
};

export async function POST() {
  return signOutHandler();
}

export async function GET() {
  return signOutHandler();
}
