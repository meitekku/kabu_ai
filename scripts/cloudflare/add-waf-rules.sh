#!/bin/bash
# WAF Custom Rules を冪等に追加。
# 1) webhook (LINE / fincode) を WAF / Bot Fight Mode から skip
# 2) Tor を block on /api/agent-portfolio*
# 3) 高 threat_score を challenge on /api/agent-portfolio*

set -eu
cd /home/meiteko/project/kabu_ai
source scripts/cloudflare/cf-helpers.sh
load_cf_env

ZONE_ID=$(cf_zone_id kabu-ai.jp)
RULESET_ID=a26dfcc10ada4d4fa5025e5d0b399aba

add_or_skip() {
  local label="$1" desc="$2" data="$3"
  # 既存 rules に同じ description があれば skip
  cf_api GET "/zones/${ZONE_ID}/rulesets/${RULESET_ID}" > /tmp/_rs.json
  python3 -c "
import json, sys
d = json.load(open('/tmp/_rs.json'))
rules = d.get('result', {}).get('rules', [])
for r in rules:
    if r.get('description') == sys.argv[1]:
        sys.exit(0)
sys.exit(1)
" "$desc" && { echo "  [skip] '$label' は既に存在(desc 一致)"; return 0; }

  echo "  [add] $label"
  cf_api POST "/zones/${ZONE_ID}/rulesets/${RULESET_ID}/rules" --data "$data" > /tmp/_add.json
  python3 -c "
import json, sys
d = json.load(open('/tmp/_add.json'))
if d.get('success'):
    print('    ✓ created')
else:
    print('    ✗ failed:')
    print(json.dumps(d.get('errors'), ensure_ascii=False, indent=2))
    sys.exit(1)
"
}

echo "==> Rule 1: webhook(LINE / fincode)を skip"
add_or_skip "skip webhooks" "kabu-ai: skip BotFight/WAF for webhooks (LINE & fincode)" '{
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

echo
echo "==> Rule 2: Tor を block on /api/agent-portfolio*"
add_or_skip "block Tor" "kabu-ai: block Tor on anon AI API" '{
  "action": "block",
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\") and ip.src.country eq \"T1\")",
  "description": "kabu-ai: block Tor on anon AI API",
  "enabled": true
}'

echo
echo "==> Rule 3: 高 threat_score を managed_challenge on /api/agent-portfolio*"
add_or_skip "challenge high threat" "kabu-ai: challenge high-threat IPs on anon AI API" '{
  "action": "managed_challenge",
  "expression": "(starts_with(http.request.uri.path, \"/api/agent-portfolio\") and cf.threat_score ge 10)",
  "description": "kabu-ai: challenge high-threat IPs on anon AI API",
  "enabled": true
}'

echo
echo "==> 最終ルール一覧"
cf_api GET "/zones/${ZONE_ID}/rulesets/${RULESET_ID}" > /tmp/_rs_final.json
python3 -c "
import json
d = json.load(open('/tmp/_rs_final.json'))
rules = d.get('result', {}).get('rules', [])
print(f'rules total: {len(rules)} / 5 (Free 枠)')
for i, r in enumerate(rules, 1):
    print(f'  [{i}] action={r.get(\"action\")}  desc={r.get(\"description\")}')
"
