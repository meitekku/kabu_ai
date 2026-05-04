#!/bin/bash
# Cloudflare API ヘルパー(sikii スキルが参照)。
# 認証情報は kabu_ai/.env.local の以下から読み込む:
#   CLOUDFLARE_API_TOKEN  (推奨。Wrangler 互換)
#   CLOUDFLARE_ACCOUNT_ID
# 旧名 (CF_API_TOKEN / CF_ACCOUNT_ID) も後方互換でフォールバック対応。
#
# WHY: source されるため top-level で `set -eu` を入れない。各スクリプト側で
# 必要なら `set -eu` する。pipefail も同様にスクリプト側責任。

load_cf_env() {
  local env_file
  env_file="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.env.local"

  # env に既に値があればスキップ。なければ .env.local からロード。
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -z "${CF_API_TOKEN:-}" ]; then
    if [ -f "$env_file" ]; then
      # shellcheck disable=SC1090
      set -a
      source <(grep -E '^(CLOUDFLARE|CF)_(API_TOKEN|ACCOUNT_ID)=' "$env_file")
      set +a
    fi
  fi

  # 推奨名 → 旧名の順にフォールバック
  CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
  CF_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
  export CF_API_TOKEN CF_ACCOUNT_ID

  if [ -z "$CF_API_TOKEN" ]; then
    echo "ERROR: CLOUDFLARE_API_TOKEN が .env.local にも env にも無い" >&2
    return 1
  fi
  if [ -z "$CF_ACCOUNT_ID" ]; then
    echo "ERROR: CLOUDFLARE_ACCOUNT_ID が .env.local にも env にも無い" >&2
    return 1
  fi
}

cf_api() {
  local method="$1" path="$2"; shift 2
  curl -sS \
    -X "$method" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4${path}" "$@"
}

cf_api_account() {
  local method="$1" subpath="$2"; shift 2
  cf_api "$method" "/accounts/${CF_ACCOUNT_ID}${subpath}" "$@"
}

# zone_id を取得(キャッシュなし、毎回 API)
cf_zone_id() {
  local zone_name="${1:-kabu-ai.jp}"
  cf_api GET "/zones?name=${zone_name}" \
    | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not d.get("success") or not d.get("result"):
    print("zone lookup failed:", json.dumps(d, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
print(d["result"][0]["id"])
'
}
