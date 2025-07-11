# 本番環境セットアップ（事前インストール推奨）

## 1. Chrome/Chromium インストール（必須）
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y google-chrome-stable

# 確認
which google-chrome
```

## 2. Python依存関係の事前インストール
```bash
pip install -r requirements.txt
```

## 3. ChromeDriverの事前ダウンロード（推奨）
現在はwebdriver-managerが初回実行時にダウンロードしていますが、事前に固定バージョンをインストール可能：

```bash
# ChromeDriverを事前インストール
wget https://chromedriver.storage.googleapis.com/114.0.5735.90/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/local/bin/
sudo chmod +x /usr/local/bin/chromedriver
```

## 4. システム最適化
```bash
# メモリ最適化
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Chrome用の一時ディレクトリ作成
mkdir -p /tmp/chrome_profiles
chmod 755 /tmp/chrome_profiles
```

## 5. 環境変数での高速化設定（推奨）
```bash
# .env.local または本番環境に設定
export CHROME_BINARY_PATH=/usr/bin/google-chrome-stable
export CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
```

## 6. パフォーマンス向上のための設定
- ✅ Chrome binary path固定（環境変数使用）
- ✅ ChromeDriver path固定
- ✅ 一時ディレクトリの事前作成
- ✅ 不要なChrome拡張無効化

## 速度最適化済みの設定
現在のPythonスクリプトは以下で既に最適化済み：
- ✅ webdriver-manager使用（自動キャッシュ）
- ✅ 並行実行対応
- ✅ プロセス独立性確保
- ✅ 最小限のオプション設定
- ✅ 環境変数優先の高速パス検索