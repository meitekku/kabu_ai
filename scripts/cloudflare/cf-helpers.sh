#!/bin/bash
# Cloudflare API ヘルパー(sikii スキルが参照)。
# 認証情報は kabu_ai/.env.local の CF_API_TOKEN / CF_ACCOUNT_ID を使う。

set -euo pipefail

# 認証情報を kabu_ai/.env.local から読み込む(env で上書きされていればそちら優先)
load_cf_env() {
  local env_file
  env_file="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.env.local"
  if [ -z "${CF_API_TOKEN:-}" ] || [ -z "${CF_ACCOUNT_ID:-}" ]; then
    if [ -f "$env_file" ]; then
      # shellcheck disable=SC1090
      set -a; source <(grep -E '^CF_(API_TOKEN|ACCOUNT_ID)=' "$env_file"); set +a
    fi
  fi
  : "${CF_API_TOKEN:?CF_API_TOKEN is not set (.env.local 未設定)}"
  : "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID is not set (.env.local 未設定)}"
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
