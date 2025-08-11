import os
import socket
import json
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
        # 常に環境変数から取得
        username = os.getenv('TWITTER_USERNAME', 'default_username')
        password = os.getenv('TWITTER_PASSWORD', 'default_password')
        
        if is_localhost():
            print(f"📝 localhost環境: 環境変数から認証情報を取得")
        else:
            print(f"📝 本番環境: 環境変数から認証情報を取得")
            
        return username, password
    except Exception as e:
        print(f"認証情報取得エラー: {e}")
        # フォールバック: 環境変数から取得
        return os.getenv('TWITTER_USERNAME', 'default_username'), os.getenv('TWITTER_PASSWORD', 'default_password')

# グローバル設定
TWITTER_USERNAME, TWITTER_PASSWORD = get_twitter_credentials()
DEFAULT_MESSAGE = "画像付き自動投稿テスト: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
DEFAULT_IMAGE_PATH = os.getenv('DEFAULT_IMAGE_PATH', 'test.png')

def get_post_count_state_file():
    """投稿回数管理ファイルのパスを取得"""
    # Docker環境では書き込み可能なディレクトリを使用
    if os.path.exists('/tmp/twitter_state'):
        return '/tmp/twitter_state/post_count_state.json'
    # フォールバック: /tmpディレクトリを使用
    return '/tmp/post_count_state.json'

def get_post_count():
    """現在の投稿回数を取得"""
    state_file = get_post_count_state_file()
    try:
        if os.path.exists(state_file):
            with open(state_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('count', 0)
        return 0
    except Exception as e:
        return 0

def increment_post_count():
    """投稿回数をインクリメント"""
    state_file = get_post_count_state_file()
    try:
        count = get_post_count() + 1
        data = {
            'count': count,
            'last_updated': datetime.now().isoformat()
        }
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return count
    except Exception as e:
        return 0

def reset_post_count():
    """投稿回数をリセット"""
    state_file = get_post_count_state_file()
    try:
        data = {
            'count': 0,
            'last_updated': datetime.now().isoformat()
        }
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return 0
    except Exception as e:
        return 0

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