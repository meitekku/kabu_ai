import os
import base64
import urllib.parse
from datetime import datetime

from .error_reporter import ErrorReporter
from .config import DEFAULT_MESSAGE, DEFAULT_IMAGE_PATH, is_localhost_environment
from .browser_manager import create_chrome_driver, cleanup_specific_driver, kill_all_chromedrivers
from .twitter_actions import check_login_status, twitter_login, post_tweet

error_reporter = ErrorReporter()

def decode_emoji_message(encoded_message):
    """Base64エンコードされたメッセージをデコード"""
    try:
        decoded_bytes = base64.b64decode(encoded_message)
        decoded_str = decoded_bytes.decode('utf-8')
        return decoded_str
    except Exception as e:
        try:
            decoded_bytes = base64.b64decode(encoded_message)
            url_encoded_str = decoded_bytes.decode('ascii')
            decoded_str = urllib.parse.unquote(url_encoded_str)
            return decoded_str
        except Exception as e2:
            print(f"メッセージのデコードエラー: {e}, {e2}")
            error_reporter.add_error("decode_message", f"デコードエラー: {e}, {e2}", e)
            return None

def main(message=None, image_path=None, text_only=False, encoded_message=None):
    """メイン処理 - 成功時True、失敗時Falseを返す"""
    driver = None
    try:
        error_reporter.add_success("main", "メイン処理開始")
        
        # エンコードされたメッセージがある場合はデコード
        if encoded_message:
            decoded = decode_emoji_message(encoded_message)
            if decoded:
                message = decoded
                print(f"📝 エンコードされたメッセージをデコードしました")
                error_reporter.add_success("main", "エンコードされたメッセージをデコード")
        
        # メッセージが指定されていない場合はデフォルトを使用
        if message is None:
            message = DEFAULT_MESSAGE
        
        # localhost環境の場合はメッセージを100文字に制限
        if is_localhost_environment() and message and len(message) > 100:
            original_message = message
            message = message[:100] + "..."
            print(f"📝 localhost/開発環境のため、メッセージを100文字に制限")
            error_reporter.add_warning("main", f"localhost環境のため文字数制限適用: {len(original_message)}文字 → {len(message)}文字")
        
        # 画像パスが指定されていない場合はデフォルトを使用
        if image_path is None and not text_only:
            image_path = DEFAULT_IMAGE_PATH
        
        # Chromeを起動
        driver = create_chrome_driver()
        if not driver:
            error_msg = "Chromeの起動に失敗しました"
            print(f"❌ {error_msg}")
            error_reporter.add_error("main", error_msg)
            error_reporter.set_final_result(False)
            return False
        
        # ログイン状態をチェック
        is_logged_in = check_login_status(driver)
        
        # ログインが必要な場合のみログイン処理を実行
        if not is_logged_in:
            print("ログインが必要です。ログイン処理を開始します...")
            is_logged_in = twitter_login(driver)
        
        # ログイン済みの場合、ツイート投稿
        if is_logged_in:
            success = post_tweet(driver, message, None if text_only else image_path)
            
            if success:
                print("✅ 処理が正常に完了しました")
                error_reporter.add_success("main", "全処理正常完了")
                error_reporter.set_final_result(True)
                return True
            else:
                error_msg = "ツイートの投稿に失敗しました"
                print(f"❌ {error_msg}")
                error_reporter.add_error("main", error_msg)
                error_reporter.set_final_result(False)
                return False
        else:
            error_msg = "ログインに失敗したため、ツイートを投稿できませんでした"
            print(f"❌ {error_msg}")
            error_reporter.add_error("main", error_msg)
            error_reporter.set_final_result(False)
            return False
            
    except Exception as e:
        error_msg = f"予期しないエラーが発生しました: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("main", error_msg, e)
        error_reporter.set_final_result(False)
        return False
        
    finally:
        if driver:
            try:
                cleanup_specific_driver(driver)
                error_reporter.add_success("cleanup", "個別ドライバークリーンアップ完了")
            except Exception as e:
                error_reporter.add_warning("cleanup", f"個別ドライバークリーンアップエラー: {e}")
                try:
                    kill_all_chromedrivers()
                except:
                    pass

def quick_tweet(message=None):
    """簡単にテキストツイートを投稿する関数"""
    return main(message, text_only=True)

def quick_image_tweet(message=None, image_path=None):
    """簡単に画像付きツイートを投稿する関数"""
    return main(message, image_path)

def is_image_file(file_path):
    """ファイルが画像かどうかを判定する"""
    if not os.path.exists(file_path):
        return False
    
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    _, ext = os.path.splitext(file_path.lower())
    return ext in image_extensions

def print_usage():
    """使用方法を表示"""
    print("\n=== Twitter自動投稿スクリプト 使用方法 ===")
    print("引数なし:")
    print("  python script.py")
    print("  → デフォルト画像とメッセージで投稿")
    print()
    print("テキストのみ投稿:")
    print("  python script.py --text-only")
    print("  python script.py --text-only \"カスタムメッセージ\"")
    print()
    print("画像付き投稿:")
    print("  python script.py --image")
    print("  python script.py --image \"path/to/image.jpg\"")
    print("  python script.py --image \"path/to/image.jpg\" \"カスタムメッセージ\"")
    print()
    print("エンコードメッセージ（絵文字対応）:")
    print("  python script.py --encoded-message \"base64エンコードされたメッセージ\"")
    print("  python script.py --encoded-message \"base64エンコードされたメッセージ\" --image \"path/to/image.jpg\"")
    print()
    print("自動判定（推奨）:")
    print("  python script.py \"テキストメッセージ\"")
    print("  python script.py \"path/to/image.jpg\" \"メッセージ\"")
    print("  python script.py \"path/to/image.jpg\"")
    print("  → 第1引数が画像ファイルかどうかで自動判定")
    print()
    print("推奨インストール:")
    print("  pip install pyperclip  # より確実なクリップボード操作のため")
    print()
    print("ヘルプ:")
    print("  python script.py --help")
    print("===============================================\n") 