#!/usr/bin/env node

console.log('\n[RLS] Phase 3 scaffolding');
console.log('This helper does not execute SQL automatically.');
console.log('When FEATURE_RLS is enabled locally, apply the policies manually:');
console.log('  1. Ensure `DATABASE_URL` points at the target database.');
console.log('  2. Run:  psql "$DATABASE_URL" -f db/policies/rls.sql');
console.log('  3. Verify policies with `SELECT * FROM pg_policies WHERE schemaname = \'public\';`');
console.log('\nRemember to keep FEATURE_RLS=false in shared environments until Phase 3 rollout.');
