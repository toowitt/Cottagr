#!/usr/bin/env bash
#
# Helper script to purge Playwright binaries from git history using git filter-repo.
# Run locally from the repo root *after installing git-filter-repo*.
#
# Example:
#   pipx install git-filter-repo    # or use brew install git-filter-repo
#   bash scripts/git-purge-playwright.sh
#
# This will rewrite history; coordinate with the team before pushing.

set -euo pipefail

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo is required. Install it first (e.g. pipx install git-filter-repo)." >&2
  exit 1
fi

git filter-repo \
  --path "Library/Caches/ms-playwright/" \
  --path "playwright/.cache/" \
  --path "playwright-report/" \
  --path "blob-report/" \
  --path "test-results/" \
  --path "trace.zip" \
  --invert-paths
