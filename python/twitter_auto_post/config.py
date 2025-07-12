import os
import socket
from dotenv import load_dotenv
from datetime import datetime

# .envファイルを読み込む
load_dotenv('.env.local')

def is_localhost_environment():
    """localhost/開発環境かどうかを判定"""
    try:
        hostname = socket.gethostname()
        return (
            "localhost" in hostname.lower() or 
            hostname.lower() in ["localhost", "127.0.0.1"] or
            os.getenv("NODE_ENV") == "development" or
            os.getenv("ENVIRONMENT") == "development" or
            os.getenv("ENVIRONMENT") == "local" or
            os.getenv("TWITTER_TEST_MODE") == "true" or
            os.getenv("DEV_MODE") == "true" or
            os.getenv("TWITTER_LIMIT_CHARS") == "true"
        )
    except:
        return True  # エラー時は安全のためlocalhostとして扱う

def get_twitter_credentials():
    """環境に応じてTwitter認証情報を取得"""
    try:
        if is_localhost_environment():
            # localhost環境: 環境変数から取得
            username = os.getenv('TWITTER_USERNAME', 'default_username')
            password = os.getenv('TWITTER_PASSWORD', 'default_password')
            print(f"📝 localhost環境: 環境変数から認証情報を取得")
        else:
            # 本番環境: 固定の認証情報
            username = 'smartaiinvest@gmail.com'
            password = 'sarukiki1'
            print(f"📝 本番環境: 固定認証情報を使用")
            
        return username, password
    except Exception as e:
        print(f"認証情報取得エラー: {e}")
        # フォールバック: 環境変数から取得
        return os.getenv('TWITTER_USERNAME', 'default_username'), os.getenv('TWITTER_PASSWORD', 'default_password')

# デフォルト設定
DEFAULT_MESSAGE = "画像付き自動投稿テスト: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
DEFAULT_IMAGE_PATH = os.getenv('DEFAULT_IMAGE_PATH', 'test.png')

# Twitter認証情報
TWITTER_USERNAME, TWITTER_PASSWORD = get_twitter_credentials() 