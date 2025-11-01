import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { AUTH_COOKIE_DOMAIN, AUTH_COOKIE_OPTIONS } from '@/lib/auth/config';
import { consumeToken } from '@/server/lib/rateLimit';

const PROTECTED_PATHS = ['/admin', '/bookings', '/expenses', '/knowledge-hub'];
const ENABLE_RATE_LIMITS = process.env.FEATURE_RATE_LIMITS === 'true';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

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

  if (ENABLE_RATE_LIMITS) {
    const identifiers: string[] = [];
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || undefined;
    if (clientIp) {
      identifiers.push(`ip:${clientIp}`);
    }
    if (session?.user?.id) {
      identifiers.push(`user:${session.user.id}`);
    }

    for (const id of identifiers) {
      const result = consumeToken(id, {
        limit: RATE_LIMIT_MAX_REQUESTS,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
      if (!result.allowed) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter),
          },
        });
      }
    }
  }

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
