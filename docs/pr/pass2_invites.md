# Pass 2 – Invite & Membership Hardening

## Summary
- Enforced property-scoped authorization by converging all invite handling on the transactional `claimInviteByToken` helper; Supabase sign-ins now idempotently upsert a single `(userId, propertyId)` membership and mark invites claimed with the acting user.
- Centralized invite generation across setup/owner flows so emails emit role metadata, target the shared test mailbox, and feed the backfill utility.
- Documented the local Pass 2 workflow (Playwright harness, dry-run scripts) and exposed targeted npm scripts for running the invite E2E regression and backfill planning.
- “Add me as manager” now provisions exactly one MANAGER membership and relies on the same invite/membership reconciliation.

## Testing
- `npm run test`
- `npm run e2e:invites` (requires `npm run dev:test` in another shell)
- `npm run backfill:dry-run` (ensure local Postgres is reachable)

## Follow-ups (Pass 3)
- Reinstate Supabase Row Level Security with the new membership shape.
- Add rate limiting and audit trails for invite creation/resends.
- Transition invite links to short-lived signed tokens with explicit expiry handling.
