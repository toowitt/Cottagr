
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Placeholder middleware for future multi-tenant functionality
  // Currently does nothing but can be extended for:
  // - Tenant detection based on subdomain/domain
  // - Authentication checks
  // - Request routing based on tenant
  
  return NextResponse.next();
}

export const config = {
  // Match all paths except static files and API routes that don't need tenant context
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled individually)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
