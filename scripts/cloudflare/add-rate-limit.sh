#!/bin/bash
# Cloudflare Rate Limit を /api/agent-portfolio に追加(Free プランは 1 件無料枠)。
# IP あたり 10 秒で 5 リクエスト超を block する短時間バースト抑止。
# 必要 token 権限: Zone:Rate Limit:Edit + Zone:Zone:Read

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

ZONE_NAME="${ZONE_NAME:-kabu-ai.jp}"
ZONE_ID=$(cf_api GET "/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["result"][0]["id"]) if d.get("success") and d.get("result") else (sys.exit(1))')

echo "==> http_ratelimit phase の ruleset を取得"
RULESET_ID=$(cf_api GET "/zones/${ZONE_ID}/rulesets" \
  | python3 -c '
import json,sys
d = json.load(sys.stdin)
for r in d.get("result", []):
  if r.get("phase") == "http_ratelimit":
    print(r["id"]); break
')

if [ -z "$RULESET_ID" ]; then
  echo "==> Rate Limit ruleset を新規作成"
  RULESET_ID=$(cf_api POST "/zones/${ZONE_ID}/rulesets" --data '{
    "name": "kabu-ai rate limits",
    "kind": "zone",
    "phase": "http_ratelimit",
    "rules": []
  }' | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["id"])')
fi
echo "ruleset_id=$RULESET_ID"

echo
echo "==> Rate Limit ルール: /api/agent-portfolio で同一 IP が 10秒に 5 超で block"
cf_api POST "/zones/${ZONE_ID}/rulesets/${RULESET_ID}/rules" --data '{
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src", "cf.colo.id"],
    "period": 10,
    "requests_per_period": 5,
    "mitigation_timeout": 60
  },
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\"))",
  "description": "kabu-ai: anon AI API short burst rate-limit",
  "enabled": true
}' | python3 -m json.tool | head -10
