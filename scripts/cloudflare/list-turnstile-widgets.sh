#!/bin/bash
# 既存の Turnstile widget 一覧を表示する。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

RES=$(cf_api_account GET '/challenges/widgets')
echo "$RES" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not d.get("success"):
    print(json.dumps(d, ensure_ascii=False, indent=2))
    sys.exit(1)
for w in d.get("result", []):
    sk = w.get("sitekey", "?")
    mode = w.get("mode", "?")
    domains = w.get("domains")
    name = w.get("name", "")
    print(f"sitekey={sk}  mode={mode}  domains={domains}  name={name}")
'
