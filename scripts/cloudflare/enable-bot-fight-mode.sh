#!/bin/bash
# Cloudflare Bot Fight Mode を ON にする(Free プランで完全無料)。
# 既存の bot_management 設定を取得 → fight_mode=true で PUT(全フィールド指定が必要)。
# 必要 token 権限: Zone:Bot Management:Edit + Zone:Zone:Read

set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

ZONE_ID=$(cf_zone_id "${ZONE_NAME:-kabu-ai.jp}")
echo "zone_id=$ZONE_ID"

cf_api GET "/zones/${ZONE_ID}/bot_management" > /tmp/_bfm.json
python3 -c "
import json
d = json.load(open('/tmp/_bfm.json'))
r = d.get('result') or {}
print('current:', json.dumps(r, ensure_ascii=False, indent=2))
"

# 現在の設定をベースに fight_mode=true / enable_js=true に上書き
python3 -c "
import json
d = json.load(open('/tmp/_bfm.json'))
r = d.get('result') or {}
payload = {
    'enable_js': True,
    'fight_mode': True,
    'ai_bots_protection': r.get('ai_bots_protection', 'block'),
    'content_bots_protection': r.get('content_bots_protection', 'disabled'),
    'crawler_protection': r.get('crawler_protection', 'disabled'),
    'is_robots_txt_managed': r.get('is_robots_txt_managed', True),
    'cf_robots_variant': r.get('cf_robots_variant', 'off'),
}
open('/tmp/_bfm_payload.json', 'w').write(json.dumps(payload))
print('payload:', payload)
"

PAYLOAD=$(cat /tmp/_bfm_payload.json)
cf_api PUT "/zones/${ZONE_ID}/bot_management" --data "$PAYLOAD" > /tmp/_bfm_put.json
python3 -c "
import json
d = json.load(open('/tmp/_bfm_put.json'))
print('success:', d.get('success'))
r = d.get('result') or {}
print('  fight_mode:', r.get('fight_mode'))
print('  enable_js:', r.get('enable_js'))
print('  ai_bots_protection:', r.get('ai_bots_protection'))
if not d.get('success'):
    print('  errors:', d.get('errors'))
    import sys; sys.exit(1)
"
