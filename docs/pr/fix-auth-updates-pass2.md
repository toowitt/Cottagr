# Draft PR: `fix/auth-updates` → `develop`

## Summary
- Convert owner onboarding to invite-only: setup actions now create pending `Invite` records, resend flows consolidate around shared token helpers, and owners gain access only after claiming.
- `ensureUserRecord` and the reusable backfill module link `OwnerProfile` ↔ `User`, create memberships, and mark invites `CLAIMED` idempotently; the same logic powers the CLI backfill script.
- Added Playwright coverage for invite claim, multi-property assignments, and the org-admin “add me as manager” toggle using the test auth/mailbox harness (Supabase fully stubbed through Prisma).
- CI runs `prisma migrate deploy`, Vitest, Playwright with `npm run dev:test`, and publishes backfill dry-run artifacts for review.
- README documents the dual dev rigs, Playwright env flags, and backfill rehearsal commands.

## Checklist
- [ ] Playwright invite flows (Desktop Chromium) green: idempotent claim, multi-property claim, org-admin manager toggle.
- [ ] Duplicate membership SQL check returns zero rows.
- [ ] `artifacts/backfill_dry_run.txt` / `artifacts/backfill_dry_run.json` attached to the PR; head/tail captured below.
- [ ] CI (lint, typecheck, Vitest, Playwright, backfill artifacts) passing.

## Artifacts
- `backfill_dry_run.txt` head:
  ```
  <insert head after artifact generation>
  ```
- `backfill_dry_run.txt` tail:
  ```
  <insert tail after artifact generation>
  ```
- `backfill_dry_run.json` attached as an artifact (no inline excerpt).
