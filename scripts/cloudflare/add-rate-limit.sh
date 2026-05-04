#!/bin/bash
# Cloudflare Rate Limit を /api/agent-portfolio に追加。Free プランは無料枠 1 件。
# Legacy Rate Limit API (/rate_limits) を使う(Zone:Rate Limit:Edit のみで動く)。
# 同一 IP が 10 秒で 5 リクエストを超えたら 60 秒 ban。

set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

ZONE_NAME="${ZONE_NAME:-kabu-ai.jp}"
ZONE_ID=$(cf_zone_id "$ZONE_NAME")
echo "zone=$ZONE_NAME id=$ZONE_ID"

echo
echo '==> 既存の同名 Rate Limit を一掃(冪等にするため)'
EXIST=$(cf_api GET "/zones/${ZONE_ID}/rate_limits" \
  | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not d.get("success"):
    sys.exit(0)
for r in d.get("result", []) or []:
    if "kabu-ai-anon-api" in (r.get("description") or ""):
        print(r["id"])
')
if [ -n "$EXIST" ]; then
  while IFS= read -r rid; do
    [ -z "$rid" ] && continue
    echo "   delete $rid"
    cf_api DELETE "/zones/${ZONE_ID}/rate_limits/${rid}" > /dev/null
  done <<< "$EXIST"
fi

echo
echo '==> Rate Limit 追加: /api/agent-portfolio で 10s/5req 超 → 60s block'
RES=$(cf_api POST "/zones/${ZONE_ID}/rate_limits" --data '{
  "disabled": false,
  "description": "kabu-ai-anon-api: short burst block",
  "match": {
    "request": {
      "url": "kabu-ai.jp/api/agent-portfolio*",
      "schemes": ["HTTP","HTTPS"],
      "methods": ["POST","GET"]
    }
  },
  "threshold": 5,
  "period": 10,
  "action": {
    "mode": "ban",
    "timeout": 60
  }
}')
echo "$RES" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if d.get("success"):
    r = d["result"]
    print(f"  ✓ created id={r[\"id\"]}")
    print(f"    threshold={r.get(\"threshold\")}, period={r.get(\"period\")}, action={r.get(\"action\")}")
    print(f"    match url={r.get(\"match\",{}).get(\"request\",{}).get(\"url\")}")
else:
    print("  ✗ failed:")
    print(json.dumps(d, ensure_ascii=False, indent=2))
    sys.exit(1)
'
