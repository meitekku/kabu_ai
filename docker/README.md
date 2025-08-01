# Twitter Auto Post Secure - Docker版

セキュアなTwitter自動投稿APIサーバーです。外部からテキストと画像を受け取ってTwitterに投稿できます。

## 使用方法

### 1. 環境設定

```bash
# .envファイルを作成（.env.exampleをコピー）
cp .env.example .env

# Twitter認証情報を設定
# .envファイルを編集してTWITTER_USERNAMEとTWITTER_PASSWORDを設定
```

### 2. Docker起動

```bash
# Dockerコンテナをビルド・起動
docker-compose up -d

# ログを確認
docker-compose logs -f twitter-auto-post
```

### 3. API呼び出し

#### ヘルスチェック
```bash
curl http://localhost:5000/health
```

#### テキストのみ投稿
```bash
curl -X POST http://localhost:5000/post \
  -H "Content-Type: application/json" \
  -d '{"text": "テスト投稿です"}'
```

#### 画像付き投稿（ファイルアップロード）
```bash
curl -X POST http://localhost:5000/post \
  -F "text=テスト投稿です" \
  -F "image=@/path/to/image.jpg"
```

#### 画像パス指定投稿（JSON）
```bash
curl -X POST http://localhost:5000/post \
  -H "Content-Type: application/json" \
  -d '{"text": "テスト投稿です", "image_path": "/app/uploads/image.jpg"}'
```

#### 強制ログイン
```bash
curl -X POST http://localhost:5000/login
```

## APIエンドポイント

- `GET /health` - ヘルスチェック
- `POST /post` - ツイート投稿
- `POST /login` - 強制ログイン

## レスポンス例

### 成功時
```json
{
  "success": true,
  "message": "Tweet posted successfully"
}
```

### エラー時
```json
{
  "success": false,
  "error": "Invalid text: empty or too long (max 280 characters)"
}
```

## 制限事項

- テキスト最大280文字
- 画像ファイル最大5MB
- 対応画像形式: jpg, jpeg, png, gif, webp

## トラブルシューティング

### コンテナが起動しない場合
```bash
# ログを確認
docker-compose logs twitter-auto-post

# コンテナを再起動
docker-compose restart twitter-auto-post
```

### 認証エラーの場合
1. .envファイルの認証情報を確認
2. 強制ログインAPIを実行
3. コンテナを再起動

## セキュリティ

- コンテナは非rootユーザーで実行
- アップロードファイルは自動削除
- リソース制限設定済み
- ファイル形式・サイズチェック実装