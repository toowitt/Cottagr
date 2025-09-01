import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only check auth for admin routes, excluding login and API routes
  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login') &&
      !request.nextUrl.pathname.startsWith('/admin/api/')) {

    // Check for auth cookie
    const authCookie = request.cookies.get('auth');

    if (!authCookie || authCookie.value !== 'ok') {
      // Redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/((?!login|api).*)'],
};