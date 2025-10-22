# Auth Integration Guide

## Domains & Redirects
- Set `NEXT_PUBLIC_APP_URL` to the fully-qualified origin for the environment (e.g. `http://localhost:5000` for local, `https://preview.cottagr.app` for Vercel previews).
- Supabase dashboard → **Authentication → URL Configuration**: add the same origin plus `/auth/callback` to the Redirect URLs list. Include production, preview, and localhost entries.
- All auth flows use `/auth/callback`, which exchanges Supabase codes for sessions and forwards to the `redirect_to` query (default `/admin`). The login form automatically appends `redirect_to` to preserve the original destination.

## Cookie Policy
- Supabase helpers share `AUTH_COOKIE_OPTIONS`, ensuring `SameSite=Lax`, `Secure=true` on HTTPS, and consistent domain scoping.
- Middleware, server components, client components, and API routes all reuse these cookie options. Logout clears both the legacy `auth` cookie and the Supabase session cookie with the same settings.

## Email Provider Matrix
| Provider | Required env | Notes |
| --- | --- | --- |
| Supabase SMTP | `SUPABASE_SMTP_*` variables | Default; works with Mailpit/Mailhog locally. |
| Resend | `RESEND_API_KEY` | Leave `SUPABASE_SMTP_*` unset to avoid conflicts. |

`scripts/check-env.mjs` enforces that only one provider is configured per environment.

### Redirect Overrides
`NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO` can override the base callback URL. The app still attaches `redirect_to` so callbacks remain consistent.

## Testing
- Run `npx playwright test --grep @auth` with `PLAYWRIGHT_AUTH_EMAIL` and `PLAYWRIGHT_AUTH_PASSWORD` set to verify login → dashboard → logout.
- Responsive viewport tests continue to guard against layout regressions.
