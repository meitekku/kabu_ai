#!/usr/bin/env bash
# kabu-x-autopost セットアップ: プロファイルのシード → devサーバー起動 → 管理画面を開く
# 使い方:
#   bash .claude/skills/kabu-x-autopost/references/setup.sh
# 環境変数:
#   X_CHROME_SRC_PROFILE  シード元Chromeプロファイル名を固定したい場合 (例: "Profile 1")
#   ADMIN_PORT            管理画面ポート (既定 3001)
#   SKIP_DEV=1            devサーバーを起動しない（既に起動済みの場合）
set -euo pipefail

PROJECT_DIR="/Users/takahashimika/Dropbox/web_kabu_ai"
ADMIN_PORT="${ADMIN_PORT:-3000}"   # 実稼働は通常 3000（3000が埋まっていれば3001等）
cd "$PROJECT_DIR"

echo "== 1. ログイン済みChromeプロファイルを投稿用にコピー =="
python3 python/twitter_auto_post/seed_profile.py

echo "== 2. devサーバー =="
DETECTED_PORT=""
if [ "${SKIP_DEV:-0}" = "1" ]; then
  echo "SKIP_DEV=1 のため起動をスキップ"
else
  # 既に起動していれば流用（3001→3000の順で確認）
  # 初回リクエストはturbopackコンパイルで数秒かかるため長めに待つ
  for pp in "$ADMIN_PORT" 3000 3001 3002; do
    if curl -s --max-time 8 "http://localhost:${pp}" >/dev/null 2>&1; then DETECTED_PORT="$pp"; break; fi
  done
  if [ -n "$DETECTED_PORT" ]; then
    echo "既に localhost:${DETECTED_PORT} が応答（起動済み）"
  else
    echo "npm run dev をバックグラウンド起動 (ログ: /tmp/kabu_dev.log)"
    nohup npm run dev >/tmp/kabu_dev.log 2>&1 &
    # 起動ログから実ポートを検出
    for i in $(seq 1 90); do
      DETECTED_PORT=$(grep -oE "localhost:[0-9]+" /tmp/kabu_dev.log 2>/dev/null | head -1 | cut -d: -f2)
      if [ -n "$DETECTED_PORT" ] && curl -s --max-time 1 "http://localhost:${DETECTED_PORT}" >/dev/null 2>&1; then
        echo "起動確認 port=${DETECTED_PORT} (${i}秒)"; break
      fi
      DETECTED_PORT=""
      sleep 1
    done
  fi
fi
PORT_TO_OPEN="${DETECTED_PORT:-$ADMIN_PORT}"

echo "== 3. 管理画面を開く =="
open "http://localhost:${PORT_TO_OPEN}/admin/accept_ai"
echo "完了: http://localhost:${PORT_TO_OPEN}/admin/accept_ai で一括投稿できます。"
