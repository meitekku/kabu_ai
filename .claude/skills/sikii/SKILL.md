---
name: sikii
description: kabu-ai.jp の Cloudflare 操作スキル。Turnstile widget の作成・列挙・secret 回転、ゾーン情報の参照などを Cloudflare API で行う。「Turnstile widget 作って」「sitekey 確認」「Cloudflare で X したい」「sikii」と言われたら必ずこのスキルを使う。
---

# sikii — Cloudflare CLI スキル

kabu-ai.jp（Cloudflare 配下）の API 操作を一括で扱う。Wrangler CLI に Turnstile コマンドが無いため、
直接 `https://api.cloudflare.com/client/v4` を叩くスクリプト群と curl テンプレートをまとめている。

## 認証情報

`/home/meiteko/project/kabu_ai/.env.local`(git ignored) に保存。

```
CF_API_TOKEN=cfut_...        # Permissions: Account → Turnstile → Edit
CF_ACCOUNT_ID=2f102f09...
```

すべてのスクリプトは `scripts/cloudflare/cf-helpers.sh` 経由でこの値を読み込む。
環境変数で上書きすればそちらが優先される。

## ヘルパー

`scripts/cloudflare/cf-helpers.sh`:
- `load_cf_env` — .env.local から CF_API_TOKEN / CF_ACCOUNT_ID をロード
- `cf_api METHOD PATH [...curl_opts]` — `Authorization: Bearer` 付きで API を叩く
- `cf_api_account METHOD SUBPATH [...]` — `/accounts/{id}` プレフィックス付き

## 用意済みスクリプト

すべて `kabu_ai/scripts/cloudflare/` に配置。`bash <name>.sh` で動く。

| スクリプト | 何をする |
|---|---|
| `setup-turnstile.sh` | Turnstile widget を新規作成 → 本番 .env.local に書込 → PM2 再起動 → status 検証 |
| `list-turnstile-widgets.sh` | アカウント配下の Turnstile widget 一覧を sitekey 込みで表示 |
| `rotate-turnstile-secret.sh <sitekey>` | 指定 widget の secret を回転(古い secret は2時間有効) |
| `lock-origin-iptables.sh` | origin (133.130.102.77) を Cloudflare CIDR 以外から 443 で叩けないように iptables で絞る + 3000(Next.js direct) を完全 DROP。本番 ssh 上で実行 |
| `enable-bot-fight-mode.sh` | Cloudflare Bot Fight Mode を ON (Free 完全無料)。token に Zone:Bot Management:Edit が必要 |
| `add-waf-rules.sh` | /api/agent-portfolio* に Tor block + 高 threat_score challenge の WAF Custom Rule 2 件を追加 (Free 5 件枠)。token に Zone:WAF:Edit が必要 |
| `add-rate-limit.sh` | /api/agent-portfolio に短時間バースト抑止の Rate Limit を 1 件追加 (Free 1 件枠)。token に Zone:Rate Limit:Edit が必要 |

## よく使う curl テンプレート

スクリプトに無い操作を即興でやる場合:

### Turnstile widget 一覧
```bash
source scripts/cloudflare/cf-helpers.sh && load_cf_env
cf_api_account GET '/challenges/widgets' | python3 -m json.tool
```

### Turnstile widget 作成
```bash
cf_api_account POST '/challenges/widgets' \
  --data '{"domains":["kabu-ai.jp"],"mode":"managed","name":"my widget"}'
```

mode は `managed` / `non-interactive` / `invisible` の3種。

### Turnstile widget 削除
```bash
SITEKEY=0x4AAAAA...
cf_api_account DELETE "/challenges/widgets/${SITEKEY}"
```

### ゾーン一覧(zone_id 検索用)
```bash
cf_api GET '/zones?name=kabu-ai.jp' | python3 -m json.tool
```

### Cloudflare cache パージ(zone_id 必要)
```bash
ZONE_ID=$(cf_api GET '/zones?name=kabu-ai.jp' | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"][0]["id"])')
cf_api POST "/zones/${ZONE_ID}/purge_cache" --data '{"purge_everything":true}'
```

## 反映フロー(本番に新しい Turnstile widget を当てる場合)

1. `bash scripts/cloudflare/setup-turnstile.sh` を実行
2. スクリプトが widget 作成 → `133.130.102.77:/var/www/kabu_ai/.env.local` と standalone 側に
   `CLOUDFLARE_TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` を書込
3. `pm2 restart kabu_ai --update-env`
4. `curl https://kabu-ai.jp/api/cloudflare/turnstile/status` で `enabled:true` を確認

## API トークンに必要な権限

現状の token は **Turnstile Edit のみ**。WAF / Rate Limit / Bot Management を扱う
スクリプトを使うには、[Cloudflare API tokens](https://dash.cloudflare.com/profile/api-tokens)
で以下の Zone permissions を持つ token を作成し、`.env.local` の `CF_API_TOKEN`
を差し替える:

- `Zone:Zone:Read` (zone_id 取得)
- `Zone:Zone Settings:Edit` (Bot Fight Mode 等)
- `Zone:Bot Management:Edit` (enable-bot-fight-mode.sh)
- `Zone:Web Application Firewall:Edit` (add-waf-rules.sh)
- `Zone:Rate Limit:Edit` (add-rate-limit.sh)
- `Account:Turnstile:Edit` (既存の setup-turnstile.sh 用)

リソース指定で `Include → All zones from account` または対象アカウント・ゾーンを指定。

## 安全上の注意

- API token は **Turnstile Edit のみ** で発行する(全権の Global Token は使わない)
- token は `.env.local` に置き、絶対に commit しない(`.gitignore` の `.env*` で保護済)
- 漏洩疑いのときは [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) で revoke + 再発行
- secret 回転は production .env.local の差し替え + PM2 再起動が要る(自動化はまだ無い)

## トリガー語

「sikii」「Cloudflare API で〜」「Turnstile widget 作って/列挙して/回転して」「kabu-ai の sitekey」
「CF cache purge」「ゾーン id 調べて」 — このスキルを使う。
