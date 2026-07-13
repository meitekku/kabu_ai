---
name: kabu-x-autopost
description: kabu-ai をローカルで動かし、ログイン中のChromeプロファイル(例 @meiteko_stock)を流用してX(Twitter)へ自動投稿できる状態にする。プロファイルのシード → devサーバー起動 → 管理画面(/admin/accept_ai)を開くまでをセットアップする。「ローカルで自動投稿できるようにして」「X自動投稿のセットアップ」「管理画面を開いて投稿準備」「kabu-x-autopost」と言われたら使う。
---

# kabu-x-autopost — ローカルX自動投稿セットアップ

管理画面 `/admin/accept_ai` の「連続(一括)投稿」を、**普段使いのChromeのログインセッションをそのまま流用**して
API を使わずブラウザ経由で自動投稿できる状態にするスキル。追加ログインは不要。

## 仕組み（重要な背景）

- 投稿は `viaBrowser` 指定で `app/api/twitter/post/route.ts` → Python `post_via_session.py` が
  **ヘッドレスのシステムChrome**でX画面を操作して行う（X API 枠を消費しない）。
- **Chrome 136+ はデフォルトプロファイルでのリモートデバッグ(CDP)を禁止**したため、
  普段のプロファイルに `--remote-debugging-port` を付けて直接接続することは**できない**。
  → 代わりに **ログイン済みプロファイルを専用ディレクトリにコピー**して使う（`seed_profile.py`）。
- macOS の Cookie は Keychain `Chrome Safe Storage` で暗号化されている。復号のため
  `post_via_session.py` は `channel="chrome"` + `ignore_default_args=["--use-mock-keychain"]` で起動する。
  （Playwright 既定の `--use-mock-keychain` を無効化しないと Cookie を復号できずログインが引き継がれない。）
- あなたが普段使っている Chrome 自体には**一切触れない**（コピーを headless で開くだけ）。

## セットアップ手順（このスキルで実行する）

作業ディレクトリ: `/Users/takahashimika/Dropbox/web_kabu_ai`

### 1. 前提確認
- 普段の Chrome で X にログイン済みであること（どのプロファイルでも可。`seed_profile.py` が
  `auth_token` を持つプロファイルを自動検出する）。特定プロファイルを固定したい場合は
  環境変数 `X_CHROME_SRC_PROFILE="Profile 1"` を指定。

### 2. ログイン済みプロファイルを投稿用にコピー（シード）
```bash
cd /Users/takahashimika/Dropbox/web_kabu_ai
python3 python/twitter_auto_post/seed_profile.py
```
- 成功すると `~/.cache/x_login_profile` にコピーされ、`{"success": true, ..., "profile": "Profile 1"}` が出る。
- 管理画面のボタン経由でも実行可能: `POST /api/twitter/login`（`seed_profile.py` を呼ぶ）。
- ログイン状態(GET判定): `GET /api/twitter/login` → `{ loggedIn: true }`。

### 3. 疎通テスト（任意・実投稿されるので注意）
```bash
echo '{"message":"疎通テスト '"$(date +%H%M%S)"'"}' | python3 python/twitter_auto_post/post_via_session.py
# => {"success": true, "message": "ブラウザセッション経由で投稿しました", ...}
```
テスト投稿は後で削除すること（`references/delete_tests.py` 参照）。

### 4. dev サーバー起動（バックグラウンド）
```bash
cd /Users/takahashimika/Dropbox/web_kabu_ai
npm run dev   # 実稼働は通常 http://localhost:3000（3000が埋まっていれば3001等。起動ログで確認）
```
※ 既に起動済みなら再起動不要（`.next/dev/lock` 競合で新規起動は失敗するのが正常）。

### 5. 管理画面を開く
```bash
open "http://localhost:3000/admin/accept_ai"   # ポートは稼働中のものに合わせる
```
※ 手順4,5は `references/setup.sh` が稼働ポートを自動検出して実行する。
- ここが `enableBatchPosting={true}` の一括投稿ページ（`components/comment/admin/ApprovalList.tsx`）。
- 記事を選択 → 一括投稿。投稿前に `GET /api/twitter/login` でシード済みか確認し、
  未シードなら自動で `POST`（`seed_profile.py`）してから再投稿を促す。
- 投稿中にセッション失効 → `post_via_session.py` が `needsLogin:true`(HTTP 409) →
  UI が `TwitterLoginRequiredError` を捕捉して再シードを促す。

## 運用時のポイント
- **セッション失効/アカウント切替時**: 手順2の再シードで最新Cookieを取り込む。
- **投稿先アカウント**: シード元プロファイルのログインアカウント（例 @meiteko_stock）。
  別アカウントにしたいときは、そのアカウントでログインしているChromeプロファイル名を
  `X_CHROME_SRC_PROFILE` で指定して再シード。
- **投稿検証**: `references/verify_post.py` で自プロフィール最新ツイートにマーカー文字列が
  出るか確認できる（`success:true` はUIトースト検知ベースなので念のため）。

## トラブルシュート
| 症状 | 原因 / 対処 |
|------|------------|
| `success:true` なのに投稿されない | 旧実装の `fill()` 誤検知。現行は `keyboard.type()`＋トースト「送信しました」検知＋有効ボタンのみクリックで解消済み。 |
| ログインが引き継がれない | `--use-mock-keychain` 未除外 / `channel="chrome"` 未使用 / シード元が未ログインプロファイル。 |
| `ログイン済みプロファイルが見つからない` | 普段のChromeでXにログインしていない。ログイン後に再シード。 |
| CDPで繋ごうとして失敗 | Chrome 136+ の制限。CDPは使わずコピー方式（本スキル）で行う。 |

## 関連ファイル
- `python/twitter_auto_post/seed_profile.py` — ログイン済みプロファイルの自動検出＆コピー
- `python/twitter_auto_post/post_via_session.py` — コピーをheadlessで開いて投稿（Keychain復号対応）
- `app/api/twitter/login/route.ts` — GET(準備済み判定) / POST(シード実行)
- `app/api/twitter/post/route.ts` — `viaBrowser` でブラウザ投稿へ
- `components/comment/admin/ApprovalList.tsx` — 一括投稿UI＋ログイン誘導
- `lib/admin/postToTwitterAndWeb.ts` — `TwitterLoginRequiredError`
- `references/setup.sh` — 手順2,4,5をまとめて実行
- `references/verify_post.py` / `references/delete_tests.py` — 検証・後片付け
