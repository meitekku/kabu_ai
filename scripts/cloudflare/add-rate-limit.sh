#!/bin/bash
# Rate Limit ルール(新 Rulesets API)。Free プランは 1 件無料枠。
# /api/agent-portfolio 以下で同一 IP が 10秒に 5 リクエスト超 → 60秒 block。

set -eu
cd /home/meiteko/project/kabu_ai
source scripts/cloudflare/cf-helpers.sh
load_cf_env

ZONE_ID=$(cf_zone_id kabu-ai.jp)

# Rate Limit phase の ruleset 取得 / 無ければ作成
cf_api GET "/zones/${ZONE_ID}/rulesets" > /tmp/_rs_list.json
RULESET_ID=$(python3 -c "
import json
d = json.load(open('/tmp/_rs_list.json'))
for r in d.get('result', []):
    if r.get('phase') == 'http_ratelimit':
        print(r['id']); break
")

if [ -z "${RULESET_ID:-}" ]; then
  echo "==> http_ratelimit ruleset を新規作成"
  cf_api POST "/zones/${ZONE_ID}/rulesets" --data '{
    "name": "kabu-ai rate limits",
    "kind": "zone",
    "phase": "http_ratelimit",
    "rules": []
  }' > /tmp/_rs_create.json
  RULESET_ID=$(python3 -c "
import json, sys
d = json.load(open('/tmp/_rs_create.json'))
if not d.get('success'):
    print(json.dumps(d, indent=2), file=sys.stderr); sys.exit(1)
print(d['result']['id'])
")
fi
echo "rate-limit ruleset id=$RULESET_ID"

# 既存 rules に同 desc があれば skip
DESC="kabu-ai-anon-api: short burst block"
cf_api GET "/zones/${ZONE_ID}/rulesets/${RULESET_ID}" > /tmp/_rl_rs.json
EXIST=$(python3 -c "
import json
d = json.load(open('/tmp/_rl_rs.json'))
rules = d.get('result', {}).get('rules', [])
for r in rules:
    if r.get('description') == '$DESC':
        print(r.get('id'))
        break
" || echo "")

if [ -n "$EXIST" ]; then
  echo "  [skip] 既に存在 id=$EXIST"
else
  echo "==> Rate Limit rule 追加"
  cf_api POST "/zones/${ZONE_ID}/rulesets/${RULESET_ID}/rules" --data "{
    \"action\": \"block\",
    \"ratelimit\": {
      \"characteristics\": [\"ip.src\", \"cf.colo.id\"],
      \"period\": 10,
      \"requests_per_period\": 5,
      \"mitigation_timeout\": 10
    },
    \"expression\": \"(starts_with(http.request.uri.path, \\\"/api/agent-portfolio\\\"))\",
    \"description\": \"$DESC\",
    \"enabled\": true
  }" > /tmp/_rl_add.json
  python3 -c "
import json, sys
d = json.load(open('/tmp/_rl_add.json'))
if d.get('success'):
    print('  ✓ created')
else:
    print('  ✗ failed:')
    print(json.dumps(d.get('errors'), indent=2))
    sys.exit(1)
"
fi

echo
echo "==> 最終 rate-limit ルール一覧"
cf_api GET "/zones/${ZONE_ID}/rulesets/${RULESET_ID}" > /tmp/_rl_final.json
python3 -c "
import json
d = json.load(open('/tmp/_rl_final.json'))
rules = d.get('result', {}).get('rules', [])
print(f'rules total: {len(rules)} / 1 (Free 枠)')
for i, r in enumerate(rules, 1):
    rl = r.get('ratelimit', {})
    print(f'  [{i}] {r.get(\"action\")}  desc={r.get(\"description\")}')
    print(f'       {rl.get(\"requests_per_period\")} req / {rl.get(\"period\")}s, ban {rl.get(\"mitigation_timeout\")}s, by {rl.get(\"characteristics\")}')
"
