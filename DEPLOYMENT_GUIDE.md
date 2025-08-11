# 他のサーバーへのデプロイガイド

このガイドでは、`git pull`後に他のサーバーでTwitter自動投稿機能を使えるようにする手順を説明します。

## 前提条件

- Ubuntu 20.04+ または macOS（その他のOSも可能ですが、コマンドが異なる場合があります）
- Node.js 16以上
- Python 3.8以上
- Git
- sudo権限（Chrome/ChromeDriverインストール用）

## セットアップ手順

### 1. リポジトリのクローン/更新

```bash
# 新規の場合
git clone [リポジトリURL]
cd web_kabu_ai

# 既存の場合
cd web_kabu_ai
git pull origin main
```

### 2. Node.js依存関係のインストール

```bash
npm install
```

### 3. Python環境のセットアップ

#### 3.1 Python仮想環境の作成（推奨）

```bash
# 仮想環境を作成
python3 -m venv venv

# 仮想環境を有効化
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows
```

#### 3.2 Python依存関係のインストール

```bash
pip install -r python/requirements.txt
```

### 4. Google Chromeのインストール

#### Ubuntu/Debian

```bash
# 依存関係をインストール
sudo apt update
sudo apt install -y wget gnupg

# Google Chromeの公式リポジトリを追加
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'

# Chromeをインストール
sudo apt update
sudo apt install -y google-chrome-stable

# バージョン確認
google-chrome --version
```

#### macOS

```bash
# Homebrewを使用
brew install --cask google-chrome
```

#### CentOS/RHEL

```bash
# リポジトリを追加
sudo cat << EOF > /etc/yum.repos.d/google-chrome.repo
[google-chrome]
name=google-chrome
baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF

# インストール
sudo yum install -y google-chrome-stable
```

### 5. 環境変数の設定

#### 5.1 `.env.local`ファイルの作成

```bash
# テンプレートをコピー
cp .env.example .env.local

# 編集
nano .env.local  # または好みのエディタで編集
```

#### 5.2 必要な環境変数を設定

```env
# Twitter認証情報（必須）
TWITTER_USERNAME=your_twitter_username_or_email
TWITTER_PASSWORD=your_twitter_password

# データベース接続情報（既存の設定に合わせる）
DATABASE_URL=your_database_url

# その他の環境変数...

# オプション：ヘッドレスモード（サーバー環境では推奨）
HEADLESS=true

# オプション：Chrome実行パス（自動検出されない場合）
# CHROME_BINARY_PATH=/usr/bin/google-chrome-stable
```

### 6. ディレクトリ権限の設定

```bash
# 一時ファイル用ディレクトリの作成と権限設定
mkdir -p temp/uploads
mkdir -p public/uploads
mkdir -p twitter_profiles
chmod 755 temp/uploads public/uploads twitter_profiles

# Pythonスクリプトに実行権限を付与
chmod +x python/twitter_auto_post_secure.py
```

### 7. 追加の依存関係（Ubuntu/Debian）

```bash
# ヘッドレスChrome実行に必要なライブラリ
sudo apt install -y \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# 日本語フォント（日本語投稿の場合）
sudo apt install -y fonts-noto-cjk
```

### 8. セキュリティ設定（本番環境）

#### 8.1 AppArmorの設定（Ubuntuの場合）

```bash
# Chromeのプロファイルが問題を起こす場合
sudo aa-disable /etc/apparmor.d/usr.bin.google-chrome-stable
```

#### 8.2 ファイアウォール設定

```bash
# Next.jsのポート（デフォルト3000）を開放
sudo ufw allow 3000/tcp
```

### 9. アプリケーションのビルドと起動

#### 開発環境

```bash
npm run dev
```

#### 本番環境

```bash
# ビルド
npm run build

# 起動
npm start
```

### 10. PM2を使用した永続化（推奨）

```bash
# PM2のインストール
npm install -g pm2

# アプリケーションの起動
pm2 start npm --name "kabu_ai" -- start

# 自動起動の設定
pm2 startup
pm2 save

# ログの確認
pm2 logs kabu_ai
```

## 動作確認

### 1. ヘルスチェック

```bash
curl http://localhost:3000/api/twitter/post_selenium
```

期待されるレスポンス：
```json
{
  "error": "Method not allowed. Use POST to submit tweet data"
}
```

### 2. テスト投稿（コマンドライン）

```bash
# Pythonスクリプトの直接実行
cd python
python twitter_auto_post_secure.py --text-only "テスト投稿"
```

### 3. APIエンドポイント経由のテスト

```bash
curl -X POST http://localhost:3000/api/twitter/post_selenium \
  -H "Content-Type: application/json" \
  -d '{
    "message": "APIテスト投稿",
    "textOnly": true
  }'
```

## トラブルシューティング

### Chrome起動エラー

```bash
# Chromeプロセスの確認
ps aux | grep chrome

# 残存プロセスの終了
pkill -f chrome

# 一時ファイルのクリア
rm -rf /tmp/.org.chromium.*
rm -rf /tmp/chrome_*
```

### Python実行エラー

```bash
# Pythonバージョン確認
python3 --version

# 依存関係の再インストール
pip install --upgrade -r python/requirements.txt
```

### 権限エラー

```bash
# ディレクトリ権限の修正
sudo chown -R $USER:$USER .
chmod -R 755 temp/ public/uploads/ twitter_profiles/
```

### ヘッドレスモードでの文字化け

```bash
# 日本語フォントのインストール
sudo apt install fonts-noto-cjk  # Ubuntu/Debian
brew install font-noto-cjk        # macOS
```

## 環境別の推奨設定

### VPSやクラウドサーバー（GUI無し）

`.env.local`:
```env
HEADLESS=true
CHROME_BINARY_PATH=/usr/bin/google-chrome-stable
```

### ローカル開発環境（GUI有り）

`.env.local`:
```env
HEADLESS=false
# CHROME_BINARY_PATHは自動検出に任せる
```

### Docker環境（参考）

現在はDockerを使用していませんが、必要な場合は以下の設定で動作可能です：

```dockerfile
FROM node:18-slim

# Chrome依存関係をインストール
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    fonts-liberation libappindicator3-1 libasound2 \
    libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 \
    libgbm1 libgtk-3-0 libnspr4 libnss3 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils python3 python3-pip

# Chromeをインストール
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# 作業ディレクトリ設定とファイルコピー
WORKDIR /app
COPY . .

# 依存関係インストール
RUN npm install
RUN pip3 install -r python/requirements.txt

# ビルド
RUN npm run build

# 起動
CMD ["npm", "start"]
```

## セキュリティに関する注意事項

1. **認証情報の管理**
   - `.env.local`ファイルは絶対にGitにコミットしない
   - 本番環境では環境変数で管理することを推奨

2. **アクセス制限**
   - `/api/twitter/post_selenium`エンドポイントには認証を追加することを推奨
   - ファイアウォールで不要なポートは閉じる

3. **ログ管理**
   - Twitter投稿のログは適切に管理・定期削除する
   - 個人情報を含む可能性があるため注意

## 完了チェックリスト

- [ ] Node.js依存関係のインストール完了
- [ ] Python依存関係のインストール完了
- [ ] Google Chromeのインストール完了
- [ ] 環境変数の設定完了
- [ ] ディレクトリ権限の設定完了
- [ ] アプリケーションのビルド完了
- [ ] テスト投稿の成功
- [ ] PM2等での永続化設定（本番環境のみ）

## サポート

問題が発生した場合は、以下を確認してください：

1. エラーログ: `pm2 logs` または `npm run dev`の出力
2. Chromeのバージョン: `google-chrome --version`
3. Pythonのバージョン: `python3 --version`
4. 環境変数の設定: `cat .env.local`（パスワードは隠して）