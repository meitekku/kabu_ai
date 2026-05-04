#!/bin/bash
# /api/agent-portfolio* に対する WAF Custom Rule を追加(Free プランは 5 件枠)。
# 1) webhook パス(LINE / fincode 等)を Bot Fight Mode から除外する skip rule
# 2) Tor exit (T1) を block on /api/agent-portfolio*
# 3) 高 threat_score (>=10) を managed_challenge on /api/agent-portfolio*
# 必要 token 権限: Zone:WAF:Edit + Zone:Zone:Read

set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

ZONE_NAME="${ZONE_NAME:-kabu-ai.jp}"
ZONE_ID=$(cf_zone_id "$ZONE_NAME")
echo "zone=$ZONE_NAME id=$ZONE_ID"

echo
echo '==> http_request_firewall_custom ruleset を取得 / 無ければ作成'
RULESET_ID=$(cf_api GET "/zones/${ZONE_ID}/rulesets" \
  | python3 -c '
import json,sys
d = json.load(sys.stdin)
for r in d.get("result", []):
  if r.get("phase") == "http_request_firewall_custom":
    print(r["id"]); break
')

if [ -z "$RULESET_ID" ]; then
  echo "==> 新規作成"
  RULESET_ID=$(cf_api POST "/zones/${ZONE_ID}/rulesets" --data '{
    "name": "kabu-ai default",
    "kind": "zone",
    "phase": "http_request_firewall_custom",
    "rules": []
  }' | python3 -c '
import json,sys
d = json.load(sys.stdin)
if not d.get("success"):
    print(json.dumps(d, ensure_ascii=False, indent=2), file=sys.stderr); sys.exit(1)
print(d["result"]["id"])
')
fi
echo "ruleset_id=$RULESET_ID"

add_rule() {
  local label="$1" data="$2"
  echo
  echo "==> $label"
  local res
  res=$(cf_api POST "/zones/${ZONE_ID}/rulesets/${RULESET_ID}/rules" --data "$data")
  local ok
  ok=$(echo "$res" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("success"))')
  if [ "$ok" != "True" ]; then
    echo "$res" | python3 -m json.tool
    return 1
  fi
  echo "$res" | python3 -c 'import json,sys;rs=json.load(sys.stdin)["result"]["rules"];print("  rule count now:", len(rs)); print("  last id:", rs[-1]["id"]); print("  action:", rs[-1].get("action")); print("  expr:", rs[-1]["expression"][:120])'
}

# Rule 1: webhook を skip(Bot Fight Mode を含む managed challenge を素通り)
add_rule "Rule 1: webhook (LINE / fincode) skip" '{
  "action": "skip",
  "action_parameters": {
    "ruleset": "current",
    "phases": ["http_ratelimit","http_request_firewall_managed"],
    "products": ["bic","hot","rateLimit","securityLevel","uaBlock","waf","zoneLockdown"]
  },
  "expression": "(starts_with(http.request.uri.path, \"/api/line/webhook\") or starts_with(http.request.uri.path, \"/api/webhook\"))",
  "description": "kabu-ai: skip BotFight/WAF for webhooks (LINE & fincode)",
  "enabled": true
}'

# Rule 2: Tor を block
add_rule "Rule 2: Tor を block on /api/agent-portfolio*" '{
  "action": "block",
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\") and ip.src.country eq \"T1\")",
  "description": "kabu-ai: block Tor on anon AI API",
  "enabled": true
}'

# Rule 3: 高 threat_score を challenge
add_rule "Rule 3: 高 threat_score を managed_challenge on /api/agent-portfolio*" '{
  "action": "managed_challenge",
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\") and cf.threat_score ge 10)",
  "description": "kabu-ai: challenge high-threat IPs on anon AI API",
  "enabled": true
}'

echo
echo "==> 完了。最終ルール一覧:"
cf_api GET "/zones/${ZONE_ID}/rulesets/${RULESET_ID}" \
  | python3 -c '
import json,sys
d = json.load(sys.stdin)["result"]
for i, r in enumerate(d.get("rules", []), 1):
    print(f"  [{i}] action={r.get(\"action\")} desc={r.get(\"description\", \"\")} ")
    print(f"      expr={r.get(\"expression\", \"\")[:140]}")
'
