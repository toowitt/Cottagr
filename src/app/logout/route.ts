import { NextResponse } from 'next/server';
import { AuthSessionMissingError } from '@supabase/supabase-js';
import { createRouteSupabaseClient } from '@/lib/supabase/server';

const buildRedirect = (request: Request) => {
  const originHeader = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  const origin = originHeader ?? `${requestUrl.protocol}//${requestUrl.host}`;
  const safeOrigin = origin.replace('0.0.0.0', 'localhost');
  const redirectUrl = new URL('/login', safeOrigin);
  redirectUrl.searchParams.set('message', 'signed-out');
  return redirectUrl;
};

const signOutHandler = async (request: Request) => {
  const supabase = await createRouteSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error && !(error instanceof AuthSessionMissingError)) {
    console.error('Supabase sign out failed', error);
  }
  const response = NextResponse.redirect(buildRedirect(request), { status: 303 });
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0];
  const supabaseCookieName = projectRef ? `sb-${projectRef}-auth-token` : 'sb-auth-token';

  response.cookies.set('auth', '', { path: '/', maxAge: 0 });
  response.cookies.set(supabaseCookieName, '', { path: '/', maxAge: 0 });
  return response;
};

export async function POST(request: Request) {
  return signOutHandler(request);
}

export async function GET(request: Request) {
  return signOutHandler(request);
}
