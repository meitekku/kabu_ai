# インシデント調査ログ: Yahooコメント機能停止 / Webサーバーディスク満杯

- **記録日**: 2026-06-15
- **調査者**: Claude Code
- **対象サーバー**: Webサーバー `133.130.102.77`（root / `~/.ssh/key-2024-09-08-16-29.pem` でアクセス。`common_calc.py:828` 参照）
- **報告された症状**: ローカルでYahooコメント取得機能が動いていないように見える
- **ステータス**: MongoDB復旧済み・ディスク回復済み・ログ整理済み。**スケジューラ2本は意図的に未復旧（ユーザー指示）**

---

## 1. 症状と一次原因

ローカル(`localhost:3001`)の `GET /api/bbs/comments/[code]` が HTTP 500・空配列を返す。
`.env.local` / `python_kabu_ai/.env` の `MONGO_URI` は Webサーバー `133.130.102.77:27017` を直参照しており、そこへの接続が `[Errno 111] Connection refused`。
本番Pythonサーバー(`160.251.237.54`)からも同様に refused だったため、**ローカル固有ではなく MongoDB サーバー側の停止**と判明。

MongoDB の所在: Pythonサーバーには mongod 不在（binary/service/port すべて無し）。`MONGO_URI` の通り **MongoDB は Webサーバー側**。同ホストの MySQL(3306) は生存していたため「ホストは生きているが mongod だけ停止」と特定。

## 2. 根本原因の連鎖

```
[A] /var/www/kabu_ai/node_modules がサーバーから消失（全依存欠落）
      └─ 公開サイトは .next/standalone（依存同梱）で稼働継続 → 表面化せず
      └─ tsx起動の scheduler 2本はトップ階層 node_modules が必須 → 起動即クラッシュ
            favorites-scheduler (scripts/favorites-news-scheduler.ts)  : 2026-03-01 15:30 〜
            pts-line-scheduler   (scripts/pts-line-notifier.ts)        : 2026-03-07 12:07 〜
            エラー: `Error: Cannot find module 'node-cron'`
[B] PM2 が両プロセスを無限再起動（各 約1,490万回）
      └─ *-error.log が 各15GB まで肥大（logrotate 未設定）
[C] 同時に /var/log/mongodb/mongod.log も logrotate 未設定で 30GB まで肥大
[D] ディスク / が 100%（99G中95G使用・空き0）に到達
[E] WiredTiger が書き込み不能 → mongod が 2026-06-13 16:33:30 に exit code 1 でクラッシュ
[F] mongod 停止 → Yahooコメントの書き込み(scraper)・読み出し(Web API)が全停止
```

`node-cron` は package.json(`^4.2.1`) と package-lock.json の双方に正しく宣言されているが、**サーバーの node_modules に物理的に存在しない**（インストール漏れ／node_modules削除）のが起点。デプロイ(`main.yml`)の `npm ci --legacy-peer-deps` は GitHub Actions 上で実行されるもので、本番サーバーの node_modules を再生成する保証がない構成。

## 3. 証拠（調査時の実測）

| 確認項目 | 結果 |
|---------|------|
| `133.130.102.77:27017` TCP（local/py-server両方） | Connection refused |
| `133.130.102.77:3306`（MySQL） | OPEN（`bbs_data` 4394件・last_update有） |
| `systemctl status mongod` | `failed` (exit 1) since 2026-06-13 16:33:30 JST |
| `df -h /`（障害時） | 99G中95G使用 / **100%** / 空き0 |
| `/var/log/mongodb/mongod.log` | **30GB**（logrotate設定なし） |
| `/root/.pm2/logs/favorites-scheduler-error.log` | **15GB** |
| `/root/.pm2/logs/pts-line-scheduler-error.log` | **15GB** |
| `/var/www/kabu_ai/node_modules` | **ディレクトリごと不在**（next/react/mongodb/tsx/better-auth/node-cron 全欠落） |
| `.next` / `.next/standalone` | 存在（公開サイトはこれで稼働） |
| 公開サイト `https://kabu-ai.jp/` | HTTP 200（正常） |
| PM2 `kabu_ai`（npm） | online / restarts=93 |
| PM2 `favorites-scheduler`(tsx) | online表示だが restarts≈**14,904,909**（実態はクラッシュループ） |
| PM2 `pts-line-scheduler`(tsx) | online表示だが restarts≈**14,893,286**（同上） |
| MongoDB `yahoo_comment` | 約2,971万件（復旧後に確認） |

## 4. 今回実施した対応（復旧・恒久化）

1. `mongod.log`(30GB) を truncate + `journalctl --vacuum-size=200M` → **約32GB解放**
2. `systemctl start mongod` → **active / 0.0.0.0:27017 復旧**
3. `/etc/logrotate.d/mongodb` 新規作成（daily / size 500M / rotate 7 / compress / copytruncate）
4. PM2エラーログ2本を「直近2000行を残して truncate」→ **約30GB解放**（合計 / は 100%→36%、空き62G）
5. `pm2 install pm2-logrotate`（max_size 10M / retain 10 / compress / 毎日0時）で今後のログ肥大を恒久防止
6. ローカル `pm2 restart kabu-dev`（mongoダウン中に掴んだ壊れたMongoClientキャッシュ破棄）
   → `GET /api/bbs/comments/7203`・`/9984` が **HTTP 200・各50件** 返ることを確認

## 5. 未対応（ユーザー指示により復旧しない）

- **favorites-scheduler / pts-line-scheduler の復旧**: 依存欠落のため引き続きクラッシュループ状態。
  - 影響機能: **LINEお気に入りニュース通知** と **PTS(時間外)LINE通知** が 2026-03 上旬から停止中。
  - pm2-logrotate 導入によりログ溢れは止まるが、機能自体は停止のまま。

## 6. 推奨復旧手順（未実行・参考）

```bash
cd /var/www/kabu_ai
npm ci --legacy-peer-deps          # node_modules を package-lock.json から再生成
pm2 restart favorites-scheduler pts-line-scheduler
pm2 save
# 確認: pm2 logs favorites-scheduler --lines 20 でクラッシュが止まったこと
```

## 7. 再発防止の宿題（恒久対策候補）

- デプロイ(`main.yml`)に **本番サーバー側での `npm ci` 実行** を組み込む（standalone同梱外の tsx スクリプト依存を保証）。
- もしくは scheduler 系も standalone/bundle 化、あるいは PM2 の `max_restarts` / `min_uptime` を設定して無限再起動とログ溢れを抑止。
- ディスク使用率の監視アラート（80%閾値）を追加。
