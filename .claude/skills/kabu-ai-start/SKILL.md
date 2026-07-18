---
name: kabu-ai-start
description: 株AI(kabu_ai)サイトをローカルのNext.jsアプリとして起動し、管理画面(/admin/accept_ai)をブラウザで開く。「サイトを起動して」「kabu aiを起動して」「サイトを立ち上げて」「管理画面を開いて」と言われたら使う。
---

# kabu-ai-start — 株AIサイトの起動と管理画面表示

「サイトを起動して」と言われたら、kabu_ai を Next.js の dev サーバーとして起動し、
現在使っている管理画面 `/admin/accept_ai`（AI記事承認・一括投稿の管理画面、
`components/comment/admin/ApprovalList.tsx` を使用）をブラウザで開く。

## 手順

### 1. 作業ディレクトリ
```bash
cd /Users/youmeiyuu/kabu_ai
```

### 2. dev サーバーが既に起動しているか確認
```bash
lsof -i :3000 -i :3001 2>/dev/null
```
- 既に起動していれば再起動しない（`.next/dev/lock` 競合で新規起動が失敗するのが正常。
  そのポートをそのまま使う）。
- 起動していなければ次のステップでバックグラウンド起動する。

### 3. 未起動なら dev サーバーをバックグラウンド起動
```bash
nohup npm run dev > /tmp/kabu_ai_dev.log 2>&1 &
disown
sleep 6
tail -n 20 /tmp/kabu_ai_dev.log
```
- ログの `- Local: http://localhost:XXXX` から実際のポート番号を確認する
  （3000が埋まっていれば3001などにフォールバックすることがある）。
- `✓ Ready` が出るまで数秒待つ。

### 4. 管理画面をブラウザで開く
```bash
open "http://localhost:<検出したポート>/admin/accept_ai"
```
- 認証保護されているため、未ログインなら `/login` にリダイレクトされる
  （これは正常な挙動。ログイン自体はこのスキルの範囲外）。
- ローカル(`localhost`)でのログインには better-auth の `trustedOrigins` に
  `http://localhost:3000`/`3001` が含まれている必要がある
  （`lib/auth/auth.ts`、`NODE_ENV !== "production"` の場合のみ許可）。

## 関連ファイル
- `app/admin/accept_ai/page.tsx` — 管理画面のページ本体
- `components/comment/admin/ApprovalList.tsx` — 一覧・一括投稿UI
- `lib/auth/auth.ts` — ローカルログインの trustedOrigins 設定
- `.claude/skills/kabu-renzokutoukou-test/SKILL.md` — この画面での一括投稿(連続投稿)動作確認
