#!/usr/bin/env bash
set -euo pipefail

# LaunchBlitz verification gate.
# Runs the full quality suite: lint, typecheck, unit tests, build, and e2e.
# Run this before opening a PR; CI (PR Verify) runs the same script.
#
# Usage:
#   ./scripts/verify.sh            # full gate (includes e2e)
#   ./scripts/verify.sh --no-e2e   # skip the slow Playwright step

cd "$(dirname "$0")/.."

RUN_E2E=1
if [[ "${1:-}" == "--no-e2e" ]]; then
  RUN_E2E=0
fi

step() {
  local label="$1"
  shift
  echo ""
  echo "▶ ${label}"
  "$@"
}

step "Lint"       npm run lint
step "Typecheck"  npm run typecheck
step "Unit tests" npm run test
step "Build"      npm run build

if [[ "$RUN_E2E" == "1" ]]; then
  step "E2E tests" npm run test:e2e
else
  echo ""
  echo "▶ E2E tests (skipped via --no-e2e)"
fi

echo ""
echo "✅ verify.sh passed"
