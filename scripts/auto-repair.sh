#!/bin/bash
# auto-repair.sh - Automated test failure repair using Claude API
# Usage: ./scripts/auto-repair.sh <test-output-file> <test-type>
# test-type: "unit" or "e2e"

set -euo pipefail

TEST_OUTPUT_FILE="${1:?Usage: auto-repair.sh <test-output-file> <test-type>}"
TEST_TYPE="${2:-unit}"
MAX_RETRIES=2
RETRY_COUNT=0
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Auto-Repair Started ==="
echo "Test output: $TEST_OUTPUT_FILE"
echo "Test type: $TEST_TYPE"
echo "Max retries: $MAX_RETRIES"

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ERROR: ANTHROPIC_API_KEY is not set"
  exit 1
fi

# Truncate test output to avoid exceeding API limits
truncate_output() {
  local file="$1"
  local max_chars=8000
  local content
  content=$(cat "$file")
  if [ ${#content} -gt $max_chars ]; then
    echo "${content:0:$max_chars}... [truncated]"
  else
    echo "$content"
  fi
}

# Extract failed test file paths from vitest/playwright output
extract_failed_files() {
  local output_file="$1"
  grep -oP '(?:FAIL|ERROR|✗|×)\s+\K[^\s]+\.(test|spec)\.(ts|tsx)' "$output_file" 2>/dev/null | sort -u || true
}

# Read source files related to the failing tests
gather_context_files() {
  local failed_tests="$1"
  local context=""

  for test_file in $failed_tests; do
    if [ -f "$test_file" ]; then
      context+="
=== TEST FILE: $test_file ===
$(cat "$test_file")
"
    fi

    # Try to find the corresponding source file
    local source_file
    source_file=$(echo "$test_file" | sed 's|__tests__/unit/||;s|__tests__/e2e/||;s|\.test\.|.|;s|\.spec\.|.|')
    if [ -f "$source_file" ]; then
      context+="
=== SOURCE FILE: $source_file ===
$(cat "$source_file")
"
    fi
  done

  echo "$context"
}

# Call Claude API to analyze and fix
call_claude_api() {
  local test_output="$1"
  local context_files="$2"

  local prompt="You are an automated test repair assistant. Analyze the following test failure and provide EXACT file changes to fix it.

TEST OUTPUT:
$test_output

RELEVANT FILES:
$context_files

RULES:
1. Only fix the test files or source files that are directly causing the failure
2. Be conservative - make minimal changes
3. Return your response in this EXACT format for each file change:

---FILE: path/to/file.ts---
(entire corrected file content)
---END FILE---

If the test failure is due to an environment issue (missing dependency, network issue, etc.) that cannot be fixed by code changes, respond with:
---NO FIX POSSIBLE---
reason: (explanation)
---END---"

  # Escape the prompt for JSON
  local escaped_prompt
  escaped_prompt=$(printf '%s' "$prompt" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

  local response
  response=$(curl -s --max-time 120 \
    https://api.anthropic.com/v1/messages \
    -H "content-type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "{
      \"model\": \"claude-sonnet-4-5-20250929\",
      \"max_tokens\": 8192,
      \"messages\": [{\"role\": \"user\", \"content\": $escaped_prompt}]
    }")

  # Extract text content from response
  echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'content' in data:
        for block in data['content']:
            if block.get('type') == 'text':
                print(block['text'])
    elif 'error' in data:
        print('API ERROR: ' + str(data['error']))
        sys.exit(1)
except Exception as e:
    print(f'Parse error: {e}')
    sys.exit(1)
"
}

# Apply file changes from Claude's response
apply_fixes() {
  local response="$1"
  local changes_applied=0

  if echo "$response" | grep -q "---NO FIX POSSIBLE---"; then
    echo "Claude determined no code fix is possible."
    local reason
    reason=$(echo "$response" | sed -n '/reason:/,/---END---/p' | head -1)
    echo "Reason: $reason"
    return 1
  fi

  # Extract file changes
  while IFS= read -r line; do
    if [[ "$line" =~ ^---FILE:\ (.+)---$ ]]; then
      local filepath="${BASH_REMATCH[1]}"
      filepath=$(echo "$filepath" | xargs) # trim whitespace
      local content=""
      local in_file=true

      while IFS= read -r fline; do
        if [[ "$fline" == "---END FILE---" ]]; then
          in_file=false
          break
        fi
        content+="$fline"$'\n'
      done

      if [ "$in_file" = false ] && [ -n "$filepath" ]; then
        echo "Applying fix to: $filepath"
        mkdir -p "$(dirname "$filepath")"
        printf '%s' "$content" > "$filepath"
        ((changes_applied++))
      fi
    fi
  done <<< "$response"

  echo "Applied $changes_applied file change(s)"
  [ $changes_applied -gt 0 ]
}

# Re-run failing tests
rerun_tests() {
  local test_type="$1"
  local output_file="$2"

  echo "Re-running $test_type tests..."
  if [ "$test_type" = "unit" ]; then
    npx vitest run --reporter=verbose 2>&1 | tee "$output_file"
  elif [ "$test_type" = "e2e" ]; then
    npx playwright test --reporter=line 2>&1 | tee "$output_file"
  fi

  return ${PIPESTATUS[0]}
}

# Main repair loop
echo ""
echo "Reading test failure output..."
test_output=$(truncate_output "$TEST_OUTPUT_FILE")

failed_files=$(extract_failed_files "$TEST_OUTPUT_FILE")
echo "Failed test files: ${failed_files:-'(could not detect specific files)'}"

context=$(gather_context_files "$failed_files")

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  ((RETRY_COUNT++))
  echo ""
  echo "=== Repair Attempt $RETRY_COUNT / $MAX_RETRIES ==="

  echo "Calling Claude API for analysis..."
  api_response=$(call_claude_api "$test_output" "$context")

  if [ -z "$api_response" ]; then
    echo "ERROR: Empty response from Claude API"
    continue
  fi

  echo "Applying fixes..."
  if ! apply_fixes "$api_response"; then
    echo "No fixes could be applied"
    continue
  fi

  echo "Re-running tests..."
  rerun_output="/tmp/auto-repair-rerun-$RETRY_COUNT.txt"
  if rerun_tests "$TEST_TYPE" "$rerun_output"; then
    echo ""
    echo "=== Tests PASSED after repair! ==="
    echo "Committing fix..."
    git add -A
    git commit -m "$(cat <<'EOF'
fix: auto-repair test failures (CI)

Automated fix applied by CI auto-repair system.
Test failures were analyzed and fixed using Claude API.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
    echo "Pushing fix..."
    git push
    echo "=== Auto-Repair Complete ==="
    exit 0
  else
    echo "Tests still failing after attempt $RETRY_COUNT"
    test_output=$(truncate_output "$rerun_output")
    # Update context with current file state
    failed_files=$(extract_failed_files "$rerun_output")
    context=$(gather_context_files "$failed_files")
  fi
done

echo ""
echo "=== Auto-Repair FAILED after $MAX_RETRIES attempts ==="
echo "Creating GitHub issue..."

# Create issue with failure details
issue_body="## Auto-Repair Failed

The CI auto-repair system was unable to fix the test failures after $MAX_RETRIES attempts.

### Test Type
$TEST_TYPE

### Last Test Output
\`\`\`
$(truncate_output "$TEST_OUTPUT_FILE" | head -100)
\`\`\`

### Failed Files
$failed_files

### Action Required
Please review and fix the test failures manually.

---
*This issue was automatically created by the CI auto-repair system.*"

# Try to create issue (may fail if gh is not configured)
if command -v gh &>/dev/null; then
  echo "$issue_body" | gh issue create \
    --title "CI Auto-Repair Failed: $TEST_TYPE tests" \
    --body-file - \
    --label "bug,ci" 2>/dev/null || echo "Warning: Could not create GitHub issue"
fi

exit 1
