import type { CookieOptionsWithName } from '@supabase/auth-helpers-shared';

const DEFAULT_LOCAL_APP_URL = 'http://localhost:4001';

const rawAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_APP_URL ??
  (process.env.NODE_ENV === 'production' ? undefined : DEFAULT_LOCAL_APP_URL);

if (!rawAppUrl) {
  throw new Error('NEXT_PUBLIC_APP_URL environment variable is required to run the app.');
}

if (!process.env.NEXT_PUBLIC_APP_URL && rawAppUrl === DEFAULT_LOCAL_APP_URL) {
  console.warn('NEXT_PUBLIC_APP_URL not set. Falling back to http://localhost:4001 for local development.');
}

const appUrl = new URL(rawAppUrl);

const hostname = appUrl.hostname;
const isLocalhost =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.endsWith('.local');

export const APP_URL = appUrl.origin;
export const AUTH_REDIRECT_URL = new URL('/auth/callback', APP_URL).toString();

export const PASSWORD_RESET_REDIRECT_URL = new URL('/auth/reset', APP_URL).toString();

export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  domain: !isLocalhost ? hostname : undefined,
  sameSite: 'lax',
  secure: appUrl.protocol === 'https:' && !isLocalhost ? true : false,
  path: '/',
};

export const AUTH_COOKIE_DOMAIN = !isLocalhost ? hostname : undefined;

const rawEmailRedirectBase = process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO ?? null;

export const EMAIL_REDIRECT_BASE = (() => {
  if (!rawEmailRedirectBase) {
    return AUTH_REDIRECT_URL;
  }

  try {
    const parsed = new URL(rawEmailRedirectBase);
    if (parsed.origin !== APP_URL) {
      console.warn(
        'Ignoring NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO because it points to a different origin.',
        { configured: parsed.origin, expected: APP_URL },
      );
      return AUTH_REDIRECT_URL;
    }
    return parsed.toString();
  } catch (error) {
    console.warn('Invalid NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO value. Falling back to AUTH_REDIRECT_URL.', {
      value: rawEmailRedirectBase,
      error,
    });
    return AUTH_REDIRECT_URL;
  }
})();
