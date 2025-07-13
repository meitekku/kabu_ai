import os
import socket
from datetime import datetime
from dotenv import load_dotenv
from .error_reporter import ErrorReporter
error_reporter = ErrorReporter()

# .envファイルを読み込む（Next.jsの.env.localも読める）
load_dotenv('.env.local')

def is_localhost():
    """localhost環境かどうかを判定"""
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

# Alias for compatibility
is_localhost_environment = is_localhost

def get_twitter_credentials():
    """環境に応じてTwitter認証情報を取得"""
    try:
        if is_localhost():
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

# グローバル設定
TWITTER_USERNAME, TWITTER_PASSWORD = get_twitter_credentials()
DEFAULT_MESSAGE = "画像付き自動投稿テスト: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
DEFAULT_IMAGE_PATH = os.getenv('DEFAULT_IMAGE_PATH', 'test.png')

def validate_credentials():
    """認証情報が設定されているか確認（localhost環境のみ）"""
    try:
        if is_localhost() and (TWITTER_USERNAME == 'default_username' or TWITTER_PASSWORD == 'default_password'):
            error_msg = "localhost環境では環境変数 TWITTER_USERNAME と TWITTER_PASSWORD を設定してください"
            error_reporter.add_error("environment_check", error_msg)
            print("⚠️ 警告: " + error_msg)
            print("例: export TWITTER_USERNAME='your_username'")
            print("例: export TWITTER_PASSWORD='your_password'")
            return False
        else:
            print(f"✅ 認証情報確認完了: {TWITTER_USERNAME}")
            return True
            
    except Exception as e:
        print(f"環境判定エラー: {e}")
        # エラー時は localhost として扱う
        if TWITTER_USERNAME == 'default_username' or TWITTER_PASSWORD == 'default_password':
            error_msg = "環境変数 TWITTER_USERNAME と TWITTER_PASSWORD を設定してください"
            error_reporter.add_error("environment_check", error_msg)
            print("⚠️ 警告: " + error_msg)
            return False
        return True 