import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { AUTH_COOKIE_DOMAIN, AUTH_COOKIE_OPTIONS } from '@/lib/auth/config';

const PROTECTED_PATHS = ['/admin', '/bookings', '/expenses', '/knowledge-hub'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const cookieOptions = {
    ...AUTH_COOKIE_OPTIONS,
    ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
    path: '/',
  } as const;

  const supabase = createMiddlewareClient({ req: request, res: response }, { cookieOptions });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PATHS.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtectedRoute && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/bookings/:path*', '/expenses/:path*', '/knowledge-hub/:path*'],
};
