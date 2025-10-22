import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/auth/config';

const DEFAULT_REDIRECT_PATH = '/admin';
const LOGIN_PATH = '/login';

const buildSafeRedirect = (target: string | null) => {
  if (!target) {
    return DEFAULT_REDIRECT_PATH;
  }

  try {
    const candidate = new URL(target, APP_URL);
    if (candidate.origin !== APP_URL) {
      return DEFAULT_REDIRECT_PATH;
    }
    const normalized = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    return normalized || DEFAULT_REDIRECT_PATH;
  } catch {
    return DEFAULT_REDIRECT_PATH;
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorDescription = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  const redirectToParam = url.searchParams.get('redirect_to');
  const redirectPath = buildSafeRedirect(redirectToParam);

  if (errorDescription) {
    const loginUrl = new URL(LOGIN_PATH, APP_URL);
    loginUrl.searchParams.set('error', errorDescription);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createRouteSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL(LOGIN_PATH, APP_URL);
      loginUrl.searchParams.set('error', error.message ?? 'Unable to complete sign-in');
      return NextResponse.redirect(loginUrl, { status: 303 });
    }
  }

  return NextResponse.redirect(new URL(redirectPath, APP_URL), { status: 303 });
}
