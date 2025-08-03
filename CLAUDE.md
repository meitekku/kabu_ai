# Claude Code 設定ファイル

## プロジェクト情報
- このプロジェクトは株式投資情報サイト「株AI」です
- Next.js + TypeScript で構築されています
- PostgreSQL データベースを使用しています

## 通知設定
フック設定により以下の通知が有効になっています：
- 作業完了時に macOS 通知が表示されます
- 質問受信時に通知が表示されます

### 手動通知コマンド
必要に応じて以下のコマンドを使用して通知を送信してください：

```bash
# 質問開始時の通知
osascript -e 'display notification "新しい質問を開始します" with title "Claude Code" subtitle "作業開始" sound name "Submarine"'

# 作業完了時の通知  
osascript -e 'display notification "作業が完了しました" with title "Claude Code" subtitle "作業完了" sound name "Glass"'
```

## 開発コマンド
```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # ESLint 実行
npm run lint:fix     # ESLint 自動修正
```

## その他
- TypeScript エラーチェック: `npx tsc --noEmit --skipLibCheck`
- フック設定ファイル: `.claude/settings.json`