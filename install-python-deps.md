# Python Dependencies Installation Guide

## 本番環境でのPython依存関係のインストール

本番環境でニュース要約機能を動作させるために、以下のPythonパッケージのインストールが必要です。

### 1. requirementsファイルの場所
ビルド後のstandaloneディレクトリに`requirements.txt`が配置されます：
```
/var/www/kabu_ai/.next/standalone/requirements.txt
```

### 2. インストールコマンド
本番サーバーで以下のコマンドを実行してください：

```bash
# standaloneディレクトリに移動
cd /var/www/kabu_ai/.next/standalone

# Python依存関係をインストール
pip3 install -r requirements.txt
```

### 3. 必要なパッケージ一覧
- pandas: データ分析・操作
- pymongo: MongoDB接続
- pymysql: MySQL接続
- requests: HTTP通信
- lxml: XML/HTML解析
- jpholiday: 日本の祝日計算
- pytz: タイムゾーン処理
- selenium: ブラウザ自動化
- webdriver-manager: WebDriverの自動管理
- python-dotenv: 環境変数管理
- paramiko: SSH/SFTP通信
- pyperclip: クリップボード操作

### 4. 注意点
- Python 3.7以上が必要です
- 本番環境でのインストールは管理者権限が必要な場合があります
- パッケージのバージョン依存関係に注意してください

### 5. 動作確認
インストール完了後、以下のPythonコマンドで動作確認できます：
```bash
python3 -c "import jpholiday; print('jpholiday installed successfully')"
```