#!/bin/bash
# Turnstile widget の secret を回転させる。
# 使い方: rotate-turnstile-secret.sh <sitekey>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

SITEKEY="${1:?Usage: rotate-turnstile-secret.sh <sitekey>}"
cf_api_account POST "/challenges/widgets/${SITEKEY}/rotate_secret" \
  | python3 -m json.tool
