---
name: kabu-renzokutoukou-test
description: /admin/accept_ai の連続投稿（一括投稿、renzokutoukou/ikkatsutoukou）機能をダミーデータで動作確認する。ダミー記事の投入 → dev サーバー起動 → Xログインプロファイルのシード → 管理画面でのテストまでを一気通貫でセットアップする。「連続投稿をテストして」「renzokutoukou のテスト」「ikkatsutoukou 確認」「ダミーデータ追加してテスト」と言われたら使う。
---

# kabu-renzokutoukou-test — 連続投稿(一括投稿)のダミーデータ動作確認

管理画面 `/admin/accept_ai` の一括投稿（`components/comment/admin/ApprovalList.tsx` の
`handleBatchPost`、コード内では「連続投稿」と呼ばれる）を、本番相当のデータフローのまま
ダミー記事で動作確認するスキル。X への実投稿を伴うため、ダミーデータ投入・実投稿の
両方で必ず事前にユーザーへ確認すること。

X ログインセッションのセットアップ自体は `kabu-x-autopost` スキルと共通。ログインが
まだシードされていない場合はそちらを先に実行する。

## 手順

### 1. `.env.local` の確認
本番DBへ直接 INSERT する。`DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_PORT` が
`.env.local` に無ければ動かない（無ければユーザーに用意してもらう）。

### 2. ダミー投稿の投入（本番DBへの書き込み。実行前に必ず確認）
```bash
node .claude/skills/kabu-renzokutoukou-test/references/insert_dummy_posts.js 3
```
- 引数は件数（省略時1件）。`post`(accept=0, site=70) と `post_code` に実在する銘柄コード
  （7203/6758/9984/8306/4063 を順に使用）を挿入する。
- `/admin/accept_ai` の一覧クエリ（`app/api/admin/accept_ai/route.ts`）は当日分のみ
  表示するため、`created_at` は常に `NOW()` で入れる。

### 3. dev サーバー起動 & Xログイン確認
```bash
npm run dev   # http://localhost:3000（埋まっていれば別ポート、ログで確認）
curl -s http://localhost:3000/api/twitter/login   # {"loggedIn": true} になっていること
```
`loggedIn:false` なら `POST /api/twitter/login` でプロファイルをシードする
（`kabu-x-autopost` 参照。複数プロファイルに auth_token がある場合、有効期限が新しい方を
`X_CHROME_SRC_PROFILE` で明示指定しないと期限切れの方が選ばれることがある）。

### 4. 管理画面でテスト
```bash
open "http://localhost:3000/admin/accept_ai"
```
- ダミー投稿にチェック → 画面上部の「すべて選択」で一括選択も可能
  （`ApprovalList.tsx` の `handleSelectAllChange`）。
- 「選択順で投稿する」をクリックすると実際にXへ投稿される。ダミーとはいえ実アカウントの
  タイムラインに残る点をユーザーに念押しする。

### 5. 後片付け
- DBの承認フラグを戻す/削除する場合は `post`/`post_code` を直接操作する
  （このスキルではダミーpost自体の削除スクリプトは持たない。挿入時に控えた `postId` を使う）。
- 実際に投稿されたテストツイートの削除は `kabu-x-autopost/references/delete_tests.py` を使う
  （`handle` 引数を対象アカウントに合わせて指定すること。既定値は別アカウント用なので注意）。

## 既知の不具合と対応状況（2026-07-18 修正済み）
連続投稿の実投稿処理は `python/twitter_auto_post/post_via_session.py` が
Playwright でヘッドレスChromeを操作して行う。調査の過程で見つかった2つの不具合は
コード側で修正済みだが、再発時の切り分けのために記録しておく。

| 症状 | 原因 | 対応 |
|------|------|------|
| 本文にハッシュタグ(`#...`)を含めると投稿ボタンのクリックが毎回ブロックされる（`投稿の完了を確認できませんでした`） | ハッシュタグ入力で候補サジェストのドロップダウンが開き、画面全体を覆う透明なポータル要素がクリックを奪ったまま残る。既存の `Control+Enter`/`Meta+Enter` フォールバックも不安定で当てにならない。 | 本文入力後、ボタン操作の前に `page.keyboard.press("Escape")` を実行してドロップダウンを閉じる（ドロップダウンが無い場合は無害なことを確認済み）。 |
| 実際には投稿できているのに `投稿の完了を確認できませんでした` と誤って失敗扱いになる（再試行で重複投稿の恐れ） | `/compose/post` モーダルは投稿後も閉じず本文欄が空になるだけの場合があるが、完了判定が「モーダルが閉じてホームへ遷移」のみを見ていた。 | 本文欄が空になったこと自体も完了サインとして扱うよう完了判定を拡張。 |

もしテストで同様の失敗が再発した場合は、まずこの2点の修正が現在のコードに残っているか
（`python/twitter_auto_post/post_via_session.py` の `do_post()`）を確認する。

## 関連ファイル
- `components/comment/admin/ApprovalList.tsx` — 一括投稿UI（`handleBatchPost`、`handleSelectAllChange`）
- `python/twitter_auto_post/post_via_session.py` — ブラウザセッション経由の実投稿処理
- `app/api/admin/accept_ai/route.ts` — 承認キューの取得・承認API（当日フィルタあり）
- `.claude/skills/kabu-x-autopost/SKILL.md` — Xログインプロファイルのセットアップ
- `.claude/skills/kabu-x-autopost/references/delete_tests.py` — テストツイートの削除
