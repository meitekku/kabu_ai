#!/bin/bash
# /api/agent-portfolio* に対する WAF Custom Rule を追加(Free プランは 5 件枠)。
# 1) Tor exit nodes を block (cf.threat_score の T1 国境界 = Tor)
# 2) 高 threat_score (>=10) を managed_challenge
# 必要 token 権限: Zone:WAF:Edit + Zone:Zone:Read

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

ZONE_NAME="${ZONE_NAME:-kabu-ai.jp}"
ZONE_ID=$(cf_api GET "/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["result"][0]["id"]) if d.get("success") and d.get("result") else (sys.exit(1))')

# Custom Rules ruleset を取得 / 無ければ作成
echo "==> http_request_firewall_custom ruleset を取得"
RULESET_ID=$(cf_api GET "/zones/${ZONE_ID}/rulesets" \
  | python3 -c '
import json,sys
d = json.load(sys.stdin)
for r in d.get("result", []):
  if r.get("phase") == "http_request_firewall_custom":
    print(r["id"]); break
')

if [ -z "$RULESET_ID" ]; then
  echo "==> Custom Rules ruleset を新規作成"
  RULESET_ID=$(cf_api POST "/zones/${ZONE_ID}/rulesets" --data '{
    "name": "kabu-ai default",
    "kind": "zone",
    "phase": "http_request_firewall_custom",
    "rules": []
  }' | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["id"])')
fi
echo "ruleset_id=$RULESET_ID"

echo
echo "==> ルール 1: /api/agent-portfolio* かつ Tor を block"
cf_api POST "/zones/${ZONE_ID}/rulesets/${RULESET_ID}/rules" --data '{
  "action": "block",
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\") and ip.src.country eq \"T1\")",
  "description": "kabu-ai: block Tor on anon AI API",
  "enabled": true
}' | python3 -m json.tool | head -10

echo
echo "==> ルール 2: /api/agent-portfolio* かつ threat_score >= 10 を challenge"
cf_api POST "/zones/${ZONE_ID}/rulesets/${RULESET_ID}/rules" --data '{
  "action": "managed_challenge",
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\") and cf.threat_score ge 10)",
  "description": "kabu-ai: challenge high-threat IPs on anon AI API",
  "enabled": true
}' | python3 -m json.tool | head -10
