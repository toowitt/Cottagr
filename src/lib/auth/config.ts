import type { CookieOptionsWithName } from '@supabase/auth-helpers-shared';

const DEFAULT_LOCAL_APP_URL = 'http://localhost:5000';

const rawAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_APP_URL ??
  (process.env.NODE_ENV === 'production' ? undefined : DEFAULT_LOCAL_APP_URL);

if (!rawAppUrl) {
  throw new Error('NEXT_PUBLIC_APP_URL environment variable is required to run the app.');
}

if (!process.env.NEXT_PUBLIC_APP_URL && rawAppUrl === DEFAULT_LOCAL_APP_URL) {
  console.warn('NEXT_PUBLIC_APP_URL not set. Falling back to http://localhost:5000 for local development.');
}

const appUrl = new URL(rawAppUrl);

const hostname = appUrl.hostname;
const isLocalhost =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.endsWith('.local');

export const APP_URL = appUrl.origin;
export const AUTH_REDIRECT_URL = new URL('/auth/callback', APP_URL).toString();

export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  domain: !isLocalhost ? hostname : undefined,
  sameSite: 'lax',
  secure: appUrl.protocol === 'https:' && !isLocalhost ? true : false,
  path: '/',
};

export const AUTH_COOKIE_DOMAIN = !isLocalhost ? hostname : undefined;
