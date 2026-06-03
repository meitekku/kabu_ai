#!/bin/bash
# kabu-ai 本番に Turnstile widget を作成し、secret/sitekey を本番 .env.local に書き込む。
# 認証は kabu_ai/.env.local の CF_API_TOKEN / CF_ACCOUNT_ID を使用(env で上書き可)。
# オプション環境変数:
#   WIDGET_NAME ... default: "kabu-ai (production)"
#   DOMAINS     ... default: '["kabu-ai.jp"]'
#   PROD_SSH    ... default: "root@133.130.102.77"
#   SSH_KEY     ... default: ~/.ssh/key-2024-09-08-16-29.pem

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cf-helpers.sh
source "$SCRIPT_DIR/cf-helpers.sh"
load_cf_env

WIDGET_NAME="${WIDGET_NAME:-kabu-ai (production)}"
DOMAINS="${DOMAINS:-[\"kabu-ai.jp\"]}"
PROD_SSH="${PROD_SSH:-root@133.130.102.77}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/key-2024-09-08-16-29.pem}"

echo "==> Creating Turnstile widget: ${WIDGET_NAME} / ${DOMAINS}"
PAYLOAD=$(printf '{"domains":%s,"mode":"managed","name":%s}' \
  "$DOMAINS" \
  "$(printf '%s' "$WIDGET_NAME" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')")

CREATE_RES=$(cf_api_account POST "/challenges/widgets" --data "$PAYLOAD")

SUCCESS=$(echo "$CREATE_RES" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("success"))')
if [ "$SUCCESS" != "True" ]; then
  echo "ERROR: widget create failed:"
  echo "$CREATE_RES" | python3 -m json.tool
  exit 1
fi

SITEKEY=$(echo "$CREATE_RES" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["sitekey"])')
SECRET=$(echo "$CREATE_RES" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["secret"])')

echo "✓ Widget created. sitekey=${SITEKEY}"

echo "==> Writing keys to production .env.local (and standalone copy)"
ssh -o ConnectTimeout=5 -i "$SSH_KEY" "$PROD_SSH" "
set -e
cp /var/www/kabu_ai/.env.local /var/www/kabu_ai/.env.local.bak.\$(date +%Y%m%d-%H%M%S)
cp /var/www/kabu_ai/.next/standalone/.env.local /var/www/kabu_ai/.next/standalone/.env.local.bak.\$(date +%Y%m%d-%H%M%S)

for f in /var/www/kabu_ai/.env.local /var/www/kabu_ai/.next/standalone/.env.local; do
  sed -i '/^CLOUDFLARE_TURNSTILE_SECRET_KEY=/d; /^NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=/d' \"\$f\"
  printf '\nCLOUDFLARE_TURNSTILE_SECRET_KEY=%s\nNEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=%s\n' '${SECRET}' '${SITEKEY}' >> \"\$f\"
done

pm2 restart kabu_ai --update-env >/dev/null 2>&1
sleep 3
"

echo "==> Verifying production"
sleep 2
STATUS=$(curl -sS https://kabu-ai.jp/api/cloudflare/turnstile/status)
echo "/api/cloudflare/turnstile/status -> $STATUS"
if echo "$STATUS" | grep -q '"enabled":true'; then
  echo "✓ Turnstile is now ENABLED in production"
else
  echo "⚠ Turnstile may not be enabled yet."
  exit 2
fi
