#!/bin/bash
# CI Repair Loop - Non-interactive version for Claude Code
#
# Usage: ./scripts/ci-repair-loop.sh [--no-push]
#
# Exit codes:
#   0 = CI passed, deploy successful
#   1 = Fatal error (push failed, gh not found, etc.)
#   2 = CI failed, needs repair (logs saved to /tmp/ci-failure-kabu_ai.log)
#
# Claude Code workflow:
#   1. Run this script
#   2. If exit code 2: read /tmp/ci-failure-kabu_ai.log, fix the issue, commit
#   3. Run this script again
#   4. Repeat until exit code 0 or give up
#
set -uo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
GH=/snap/bin/gh
LOG_FILE="/tmp/ci-failure-kabu_ai.log"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Parse args
NO_PUSH=false
for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=true ;;
  esac
done

echo -e "${CYAN}=== CI Repair Loop: kabu_ai ===${NC}"

# Push (unless --no-push)
if [ "$NO_PUSH" = false ]; then
  echo "Pushing to remote..."
  if ! git push 2>&1; then
    echo -e "${RED}Push failed${NC}"
    exit 1
  fi
fi

# Wait for CI to pick up the push
echo "Waiting for GitHub Actions to start..."
sleep 10

# Get the latest run for main.yml
RUN_ID=$($GH run list --workflow=main.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
  echo "Retrying run detection..."
  sleep 10
  RUN_ID=$($GH run list --workflow=main.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')
fi

if [ -z "$RUN_ID" ]; then
  echo -e "${RED}Could not find workflow run${NC}"
  exit 1
fi

echo "Watching run #$RUN_ID..."
if $GH run watch "$RUN_ID" --exit-status; then
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  CI PASSED - Deploy successful!${NC}"
  echo -e "${GREEN}============================================${NC}"
  rm -f "$LOG_FILE"
  exit 0
fi

# CI Failed — save logs and exit 2
echo ""
echo -e "${RED}============================================${NC}"
echo -e "${RED}  CI FAILED - Repair needed (exit code 2)${NC}"
echo -e "${RED}============================================${NC}"
echo ""

$GH run view "$RUN_ID" --log-failed 2>&1 > "$LOG_FILE"

echo "=== Failed Log (last 80 lines) ==="
tail -80 "$LOG_FILE"
echo ""
echo -e "${YELLOW}Full log: $LOG_FILE${NC}"

exit 2
