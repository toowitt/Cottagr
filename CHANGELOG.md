# Changelog

## Pass 2 – Invite & Membership Hardening
- Added per-property invite claim transaction that upserts memberships for `(userId, propertyId)` and records the claimant.
- Extended the Playwright harness with deterministic test-mailbox polling and documented local execution steps.
- Published CLI helpers for invite backfill dry-runs and updated documentation/PR scaffolding for the property-level auth rollout.
