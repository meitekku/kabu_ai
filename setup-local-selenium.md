# ローカル環境でのSeleniumセットアップ手順

## 概要
Twitter自動投稿機能をDockerではなくローカル環境で実行するためのセットアップ手順です。
**投稿専用の独立したChromeインスタンス**を作成し、既存のChromeブラウザには影響しません。

## 前提条件
- Python 3.8以上
- Node.js 16以上
- macOS、Linux、またはWindows
- Google Chrome ブラウザ

## 1. Google Chromeのインストール

### macOS
```bash
# Homebrewを使用
brew install --cask google-chrome
```

### Ubuntu/Debian
```bash
# 公式リポジトリから最新版をインストール
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install google-chrome-stable
```

### CentOS/RHEL
```bash
sudo yum install -y https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
```

## 2. ChromeDriverのインストール

### 自動インストール（推奨）
Seleniumが自動的に適切なバージョンのChromedriverをダウンロードします。

### 手動インストール
```bash
# Chromeのバージョンを確認
google-chrome --version

# 対応するChromedriverをダウンロード
# https://chromedriver.chromium.org/downloads から適切なバージョンを選択

# macOS/Linux
wget https://chromedriver.storage.googleapis.com/LATEST_RELEASE/chromedriver_mac64.zip
unzip chromedriver_mac64.zip
sudo mv chromedriver /usr/local/bin/
sudo chmod +x /usr/local/bin/chromedriver
```

## 3. Python依存関係のインストール

```bash
# プロジェクトディレクトリに移動
cd /path/to/web_kabu_ai

# 仮想環境を作成（推奨）
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# 依存関係をインストール
pip install -r python/requirements.txt
```

## 4. 環境変数の設定

### .env.localファイルを使用（推奨）
```bash
# .env.exampleをコピーして.env.localを作成
cp .env.example .env.local

# .env.localを編集
nano .env.local  # またはお好みのエディタで編集
```

以下の内容を設定：
```env
# Twitter自動投稿用の認証情報（必須）
TWITTER_USERNAME=your_twitter_username_or_email
TWITTER_PASSWORD=your_twitter_password

# Chrome実行パス（オプション）
# macOS
CHROME_BINARY_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Linux
# CHROME_BINARY_PATH="/usr/bin/google-chrome-stable"

# ヘッドレスモード（オプション）
HEADLESS=true
```

### シェル環境変数を使用（代替方法）
```bash
# Twitter認証情報（必須）
export TWITTER_USERNAME="your_twitter_username_or_email"
export TWITTER_PASSWORD="your_twitter_password"

# Chromeの実行パスを設定（必要な場合）
export CHROME_BINARY_PATH="/usr/bin/google-chrome-stable"  # Linux
export CHROME_BINARY_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  # macOS

# ヘッドレスモードを有効化（GUIなしで実行）
export HEADLESS=true
```

## 5. テスト実行

```bash
# Python直接実行
cd python
python twitter_auto_post_secure.py --text-only "テストメッセージ"

# Next.jsアプリ経由での実行
npm run dev
# http://localhost:3000/api/twitter/post_selenium にPOSTリクエストを送信
```

### 動作の流れ

1. **既存Chromeプロセス終了**: 既存のChromeプロセスを完全に終了
2. **新しいChromeインスタンス作成**: 永続プロファイル付きでChromeを起動
3. **Twitterにアクセス**: 自動でTwitterページに移動
4. **ログイン処理**: 環境変数の認証情報でログイン（または手動ログイン）
5. **投稿処理実行**: ログイン完了後に投稿処理を実行

## 6. トラブルシューティング

### Chrome起動エラーの場合
```bash
# Chrome関連プロセスを終了
pkill -f chrome
pkill -f chromedriver

# 一時ファイルをクリア
rm -rf /tmp/chrome_*
rm -rf /tmp/.org.chromium.*
```

### 権限エラーの場合
```bash
# Chromeとchromedriverに実行権限を付与
sudo chmod +x /usr/bin/google-chrome-stable
sudo chmod +x /usr/local/bin/chromedriver
```

### AppArmorエラーの場合（Ubuntu）
```bash
# Chrome用のAppArmorプロファイルを無効化
sudo aa-disable /etc/apparmor.d/usr.bin.google-chrome-stable
```

## 7. APIエンドポイントの使用

### POSTリクエストの例
```bash
curl -X POST http://localhost:3000/api/twitter/post_selenium \
  -H "Content-Type: application/json" \
  -d '{
    "message": "テスト投稿",
    "textOnly": true
  }'
```

### 画像付き投稿
```bash
curl -X POST http://localhost:3000/api/twitter/post_selenium \
  -H "Content-Type: application/json" \
  -d '{
    "message": "画像付き投稿",
    "imagePath": "/path/to/image.jpg"
  }'
```

## 注意事項

1. 初回実行時はTwitterのログインが必要です
2. 永続プロファイルを使用することで、ログイン状態を保持できます
3. プロファイルは`twitter_chrome_profile`ディレクトリに保存されます
4. 定期的にプロファイルをバックアップすることを推奨します