#!/bin/bash
# CI Repair Loop - Push, watch CI, repair on failure
# Usage: ./scripts/ci-repair-loop.sh [max-retries]
set -uo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
GH=/snap/bin/gh
MAX_RETRIES=${1:-3}
RETRY=0
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${CYAN}=== CI Repair Loop: kabu_ai ===${NC}"
echo "Max retries: $MAX_RETRIES"

while [ $RETRY -lt $MAX_RETRIES ]; do
  ((RETRY++))
  echo ""
  echo -e "${YELLOW}=== Attempt $RETRY / $MAX_RETRIES ===${NC}"

  # Push
  echo "Pushing to remote..."
  git push 2>&1 || { echo -e "${RED}Push failed${NC}"; exit 1; }

  # Wait for CI to pick up the push
  echo "Waiting for GitHub Actions to start..."
  sleep 10

  # Get the latest run for main.yml
  RUN_ID=$($GH run list --workflow=main.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')
  if [ -z "$RUN_ID" ]; then
    echo -e "${RED}Could not find workflow run${NC}"
    sleep 10
    RUN_ID=$($GH run list --workflow=main.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')
  fi

  echo "Watching run #$RUN_ID..."
  if $GH run watch "$RUN_ID" --exit-status; then
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  CI PASSED - Deploy successful!${NC}"
    echo -e "${GREEN}============================================${NC}"
    exit 0
  fi

  # CI Failed
  echo ""
  echo -e "${RED}============================================${NC}"
  echo -e "${RED}  CI FAILED - Repair needed${NC}"
  echo -e "${RED}============================================${NC}"
  echo ""

  # Get failure logs
  LOG_FILE="/tmp/ci-failure-kabu_ai-$(date +%Y%m%d-%H%M%S).log"
  $GH run view "$RUN_ID" --log-failed 2>&1 > "$LOG_FILE"

  echo "=== Failed Log (last 80 lines) ==="
  tail -80 "$LOG_FILE"
  echo ""
  echo -e "${YELLOW}Log saved to: $LOG_FILE${NC}"
  echo ""

  if [ $RETRY -lt $MAX_RETRIES ]; then
    echo -e "${CYAN}修復してください。修復後にEnterを押すと再pushします。${NC}"
    read -p "Press Enter to continue (or Ctrl+C to abort)..."
  fi
done

echo ""
echo -e "${RED}=== Max retries ($MAX_RETRIES) exceeded ===${NC}"
exit 1
