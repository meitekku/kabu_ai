# twitter_auto_post_secure.py
# リファクタリング後のモジュール構造を使用するバージョン

from twitter_auto_post.error_reporter import ErrorReporter
from twitter_auto_post.config import get_twitter_credentials, DEFAULT_MESSAGE, DEFAULT_IMAGE_PATH
from twitter_auto_post.browser_manager import create_chrome_driver, cleanup_specific_driver, kill_all_chromedrivers
from twitter_auto_post.text_input import input_text_with_events
from twitter_auto_post.twitter_actions import check_login_status, twitter_login, post_tweet
from twitter_auto_post.main import main, decode_emoji_message

# グローバルなエラーレポーター
error_reporter = ErrorReporter()

def main_wrapper(message=None, image_path=None, text_only=False, encoded_message=None, use_system_profile=False):
    """メイン処理（互換性維持用、内部的には改良版を呼び出し）"""
    return main(message, image_path, text_only, encoded_message, use_system_profile=use_system_profile)

def quick_tweet(message=None):
    """簡単にテキストツイートを投稿する関数 - 成功時True、失敗時Falseを返す（改良版）"""
    return main(message, text_only=True)

def quick_image_tweet(message=None, image_path=None):
    """簡単に画像付きツイートを投稿する関数 - 成功時True、失敗時Falseを返す（改良版）"""
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
    print("\n=== Twitter自動投稿スクリプト 使用方法（改良版） ===")
    print("引数なし:")
    print("  python script.py")
    print("  → デフォルト画像とメッセージで投稿（コピペ動作）")
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
    print("システムプロファイル使用（ログイン済みChromeを使用）:")
    print("  python script.py --system-profile")
    print("  python script.py --system-profile --text-only \"メッセージ\"")
    print("  python script.py --system-profile --image \"path/to/image.jpg\" \"メッセージ\"")
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

# ========== メイン実行部 ==========

if __name__ == "__main__":
    import sys
    import os
    
    # pyperclip のインストール推奨メッセージ
    try:
        import pyperclip
        print("✅ pyperclip が利用可能です（より確実なクリップボード操作のため）")
    except ImportError:
        print("ℹ️ より確実なテキスト入力のために 'pip install pyperclip' をお勧めします")
    
    # 結果を格納する変数
    result = False
    
    try:
        # ヘルプ表示
        if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', 'help']:
            print_usage()
            exit(0)
        
        # コマンドライン引数の処理
        if len(sys.argv) == 1:
            # 引数なし - デフォルトで画像付き投稿
            print("📝 デフォルト設定で画像付き投稿を実行します（改良版テキスト入力使用）")
            result = main_wrapper()
            
        elif sys.argv[1] == "--text-only":
            # テキストのみモード
            if len(sys.argv) > 2:
                message = " ".join(sys.argv[2:])
                print(f"📝 テキストのみ投稿（改良版）: {message}")
            else:
                message = None
                print("📝 デフォルトメッセージでテキスト投稿を実行します（改良版）")
            result = main_wrapper(message, text_only=True)
            
        elif sys.argv[1] == "--image":
            # 画像付きモード（明示的指定）
            image_path = None
            message = None
            
            if len(sys.argv) > 2:
                # 第2引数があるかチェック
                potential_image = sys.argv[2]
                if is_image_file(potential_image):
                    image_path = potential_image
                    if len(sys.argv) > 3:
                        message = " ".join(sys.argv[3:])
                    print(f"📝 画像付き投稿（改良版）: {image_path}, メッセージ: {message or 'デフォルト'}")
                else:
                    # 第2引数が画像でない場合は、メッセージとして扱う
                    message = " ".join(sys.argv[2:])
                    print(f"📝 デフォルト画像で投稿（改良版）, メッセージ: {message}")
            else:
                print("📝 デフォルト画像とメッセージで投稿を実行します（改良版）")
            
            result = main_wrapper(message, image_path)
            
        elif sys.argv[1] == "--encoded-message":
            # エンコードされたメッセージモード（絵文字対応）
            if len(sys.argv) < 3:
                print("❌ エンコードされたメッセージが指定されていません")
                result = False
            else:
                encoded_message = sys.argv[2]
                image_path = None
                
                # --imageオプションがあるかチェック
                if len(sys.argv) > 3 and sys.argv[3] == "--image" and len(sys.argv) > 4:
                    image_path = sys.argv[4]
                    print(f"📝 エンコードメッセージ付き画像投稿（改良版）: 画像={image_path}")
                else:
                    print("📝 エンコードメッセージでテキスト投稿（改良版）")
                
                result = main_wrapper(encoded_message=encoded_message, image_path=image_path, text_only=(image_path is None))
            
        elif sys.argv[1] == "--system-profile":
            # システムプロファイルモード
            print("📝 システムプロファイル（ログイン済みChrome）を使用して投稿します")
            
            # 残りの引数を解析
            remaining_args = sys.argv[2:]
            message = None
            image_path = None
            text_only = False
            
            if len(remaining_args) == 0:
                # 引数なし - デフォルト画像付き投稿
                print("📝 デフォルト設定で画像付き投稿（システムプロファイル）")
                result = main_wrapper(use_system_profile=True)
                
            elif remaining_args[0] == "--text-only":
                # テキストのみモード
                if len(remaining_args) > 1:
                    message = " ".join(remaining_args[1:])
                    print(f"📝 テキストのみ投稿（システムプロファイル）: {message}")
                else:
                    message = None
                    print("📝 デフォルトメッセージでテキスト投稿（システムプロファイル）")
                result = main_wrapper(message, text_only=True, use_system_profile=True)
                
            elif remaining_args[0] == "--image":
                # 画像付きモード
                if len(remaining_args) > 1:
                    potential_image = remaining_args[1]
                    if is_image_file(potential_image):
                        image_path = potential_image
                        if len(remaining_args) > 2:
                            message = " ".join(remaining_args[2:])
                        print(f"📝 画像付き投稿（システムプロファイル）: {image_path}, メッセージ: {message or 'デフォルト'}")
                    else:
                        # 第2引数が画像でない場合は、メッセージとして扱う
                        message = " ".join(remaining_args[1:])
                        print(f"📝 デフォルト画像で投稿（システムプロファイル）, メッセージ: {message}")
                else:
                    print("📝 デフォルト画像とメッセージで投稿（システムプロファイル）")
                result = main_wrapper(message, image_path, use_system_profile=True)
                
            else:
                # 自動判定モード
                first_arg = remaining_args[0]
                if is_image_file(first_arg):
                    # 第1引数が画像ファイル → 画像付き投稿
                    image_path = first_arg
                    if len(remaining_args) > 1:
                        message = " ".join(remaining_args[1:])
                    else:
                        message = None
                    print(f"📝 画像付き投稿（システムプロファイル・自動判定）: {image_path}, メッセージ: {message or 'デフォルト'}")
                    result = main_wrapper(message, image_path, use_system_profile=True)
                else:
                    # 第1引数が画像でない → テキストメッセージとして扱う
                    message = " ".join(remaining_args)
                    print(f"📝 テキスト投稿（システムプロファイル・自動判定）: {message}")
                    result = main_wrapper(message, text_only=True, use_system_profile=True)
            
        else:
            # 自動判定モード（推奨）
            first_arg = sys.argv[1]
            
            if is_image_file(first_arg):
                # 第1引数が画像ファイル → 画像付き投稿
                image_path = first_arg
                if len(sys.argv) > 2:
                    message = " ".join(sys.argv[2:])
                else:
                    message = None
                print(f"📝 画像付き投稿（自動判定・改良版）: {image_path}, メッセージ: {message or 'デフォルト'}")
                result = main_wrapper(message, image_path)
            else:
                # 第1引数が画像でない → テキストメッセージとして扱う
                message = " ".join(sys.argv[1:])
                print(f"📝 テキスト投稿（自動判定・改良版）: {message}")
                result = main_wrapper(message, text_only=True)
    
    except Exception as e:
        error_msg = f"コマンドライン引数処理エラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("command_line", error_msg, e)
        result = False
    
    finally:
        # 結果を設定
        error_reporter.set_final_result(result)
        
        # JSON詳細レポートを出力
        error_reporter.output_json_report()
        
        # Twitter投稿専用プロファイルのクリーンアップ
        try:
            from twitter_auto_post.browser_manager import cleanup_twitter_post_profiles
            cleanup_twitter_post_profiles()
        except Exception as e:
            print(f"⚠️ プロファイルクリーンアップエラー: {e}")
        
        # 結果を出力
        if result:
            print("\n🎉 最終結果: True - 処理成功（改良版テキスト入力使用）")
            exit(0)  # 成功の終了コード
        else:
            print("\n💥 最終結果: False - 処理失敗")
            exit(1)  # 失敗の終了コード