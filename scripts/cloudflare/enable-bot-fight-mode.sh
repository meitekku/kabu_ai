#!/bin/bash
# Cloudflare Bot Fight Mode を ON にする(Free プランで完全無料)。
# 既知の良くない bot を challenge / block する一段目の防御。
# 必要 token 権限: Zone:Bot Management:Edit (または Zone:Zone Settings:Edit)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

ZONE_NAME="${ZONE_NAME:-kabu-ai.jp}"
ZONE_ID=$(cf_api GET "/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["result"][0]["id"]) if d.get("success") and d.get("result") else (sys.exit(1))')

echo "==> Bot Fight Mode を ON に変更 (zone=${ZONE_NAME})"
RES=$(cf_api PATCH "/zones/${ZONE_ID}/bot_management" --data '{"fight_mode":true}')
echo "$RES" | python3 -m json.tool
