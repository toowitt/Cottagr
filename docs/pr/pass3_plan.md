# Phase 3 Rollout Plan

## Feature flags
- `FEATURE_RLS` – enable once database policies are applied via `db/policies/rls.sql`.
- `FEATURE_RATE_LIMITS` – toggle to enforce middleware rate limiting after verifying infrastructure caches.
- `FEATURE_SIGNED_INVITES` – switch when the invite issuance/claim pipeline is ready to produce signed tokens.

## Recommended order
1. Apply RLS policies in staging (`FEATURE_RLS=true`) and observe query behaviour.
2. Enable middleware rate limiting with conservative thresholds; monitor logs and adjust.
3. Flip signed invites on staging, validate claim flows, then production.

## Signed invites rollout
- Set `FEATURE_SIGNED_INVITES=true` and provide `INVITE_TOKEN_SECRET` in the runtime environment.
- Use `npm run e2e:invites:signed` (with a dev server started via `FEATURE_SIGNED_INVITES=1 INVITE_TOKEN_SECRET=... npm run dev:test`) to verify end-to-end claim behaviour.
- Keep the flag disabled in production until the dual-token flow has been verified in staging.

Keep feature flags off in production until each milestone has been verified.
