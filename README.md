# 株AI - Web株式投資情報サイト

株式投資情報を提供するWebアプリケーションです。

## 技術スタック

- **フロントエンド**: Next.js + TypeScript
- **バックエンド**: Next.js API Routes + Python
- **データベース**: PostgreSQL
- **自動化**: Selenium WebDriver

## 機能

- 株式情報の表示
- Twitter自動投稿機能
- AI分析機能

## セットアップ

### 1. 依存関係のインストール

```bash
# Node.js依存関係
npm install

# Python依存関係
pip install -r python/requirements.txt
```

### 2. 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env.local

# .env.localを編集して必要な情報を設定
```

### 3. Twitter自動投稿機能のセットアップ

ローカル環境でSeleniumを使用する場合は、[setup-local-selenium.md](./setup-local-selenium.md)を参照してください。

## 開発

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# Lintチェック
npm run lint
```

## API エンドポイント

### Twitter投稿API

```bash
POST /api/twitter/post_selenium
```

リクエストボディ:
```json
{
  "message": "投稿するメッセージ",
  "imagePath": "/path/to/image.jpg",  // オプション
  "textOnly": false  // オプション
}
```

## ディレクトリ構造

```
web_kabu_ai/
├── app/                    # Next.js App Router
│   └── api/               # APIエンドポイント
├── python/                # Pythonスクリプト
│   ├── get_data/         # データ取得関連
│   └── twitter_auto_post/ # Twitter自動投稿
├── public/               # 静的ファイル
└── docker/              # Docker設定（非推奨）
```

## 注意事項

- Twitter認証情報は環境変数で管理してください
- 初回実行時はTwitterへのログインが必要です
- ChromeとChromeDriverが必要です