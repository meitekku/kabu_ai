#!/bin/bash
# CI Watch - Monitor latest GitHub Actions run for kabu_ai
# Usage: ./scripts/ci-watch.sh
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
GH=/snap/bin/gh
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}=== CI Watch: kabu_ai ===${NC}"
echo "Waiting for latest workflow run..."

# Get the latest run
RUN_ID=$($GH run list --workflow=main.yml --limit=1 --json databaseId -q '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
  echo -e "${RED}No workflow runs found${NC}"
  exit 1
fi

echo "Watching run #$RUN_ID..."
if $GH run watch "$RUN_ID" --exit-status; then
  echo -e "${GREEN}=== CI PASSED ===${NC}"
  exit 0
else
  echo -e "${RED}=== CI FAILED ===${NC}"
  LOG_FILE="/tmp/ci-failure-kabu_ai-$(date +%Y%m%d-%H%M%S).log"
  $GH run view "$RUN_ID" --log-failed 2>&1 | tail -200 > "$LOG_FILE"
  echo "Failure logs saved to: $LOG_FILE"
  echo ""
  echo "=== Failed Log Output ==="
  cat "$LOG_FILE"
  exit 1
fi
