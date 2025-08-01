import os
import base64
import urllib.parse
import time
from datetime import datetime

from .error_reporter import ErrorReporter
from .config import DEFAULT_MESSAGE, DEFAULT_IMAGE_PATH, is_localhost_environment, get_post_count, increment_post_count, reset_post_count
from .browser_manager import create_chrome_driver, cleanup_specific_driver, kill_all_chromedrivers
from .twitter_actions import check_login_status, twitter_login, post_tweet
from .proxy_manager import get_proxy_manager, get_tor_manager

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

def main(message=None, image_path=None, text_only=False, encoded_message=None, keep_browser=True):
    """メイン処理 - 成功時True、失敗時Falseを返す"""
    driver = None
    start_time = time.time()  # 処理開始時間を記録
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
        
        # ログイン前にTorを確実に起動してIP変更（初回のみ）
        current_count = get_post_count()
        if current_count == 0:
            print("🔄 === 初回実行: Tor確実起動とIP変更 ===")
            
            # Torマネージャーを取得してTorを確実に起動
            tor_manager = get_tor_manager()
            print("🔧 メール2段階認証回避のため、まずTorを確実に起動します")
            
            # Torを確実に起動してIP変更
            ip_changed = tor_manager.change_tor_ip()
            
            if ip_changed:
                print("✅ Tor経由でIP変更成功")
                error_reporter.add_success("tor", "Tor経由IP変更成功")
            else:
                print("⚠️ Tor IP変更に失敗、通常のプロキシ変更を試行...")
                
                # Torが失敗した場合は通常のプロキシ変更を試行
                proxy_manager = get_proxy_manager()
                ip_changed_fallback, new_proxy = proxy_manager.change_ip()
                
                if ip_changed_fallback:
                    print(f"✅ 通常のプロキシでIP変更成功: {new_proxy.host}:{new_proxy.port}")
                    error_reporter.add_success("proxy", f"プロキシIP変更成功: {new_proxy.host}:{new_proxy.port}")
                else:
                    print("⚠️ すべてのIP変更方法が失敗しましたが処理を続行")
                    error_reporter.add_warning("proxy", "全IP変更方法失敗、処理続行")
        else:
            print("🚀 2回目以降の実行: IP変更をスキップして高速化")
        
        # 永続プロファイル付きChromeを起動（プロキシ設定は browser_manager で自動適用される）
        from .browser_manager import create_chrome_with_persistent_profile
        
        # 2回目以降は指紋変更強化モードを有効化
        current_count = get_post_count()
        anti_detection_mode = current_count > 0
        
        if anti_detection_mode:
            print("🔧 指紋変更強化モードでChrome起動...")
        
        driver = create_chrome_with_persistent_profile(anti_detection=anti_detection_mode)
        if not driver:
            # フォールバックとして通常のChrome起動を試行
            print("⚠️ 永続プロファイル付きChrome起動失敗、通常のChrome起動を試行...")
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
            # 現在の投稿回数を取得（再取得して最新の値を使用）
            current_count = get_post_count()
            print(f"📊 現在の投稿回数: {current_count}")
            
            # 1回目は投稿画面で終了、2回目以降は実際に投稿
            actually_post = current_count > 0
            
            # 投稿メッセージに処理時間情報を追加
            elapsed_time = time.time() - start_time
            if actually_post:
                # 2回目以降は実際に投稿するので、処理時間を含める
                time_info = f"\n⏱️ 処理時間: {elapsed_time:.2f}秒 (投稿回数: {current_count + 1}回目)"
                enhanced_message = message + time_info
            else:
                # 1回目は投稿画面準備のみ
                enhanced_message = message
            
            success = post_tweet(driver, enhanced_message, None if text_only else image_path, actually_post=actually_post)
            
            if success:
                # 投稿回数をインクリメント
                new_count = increment_post_count()
                print(f"✅ 処理が正常に完了しました (投稿回数: {new_count})")
                error_reporter.add_success("main", f"全処理正常完了 (投稿回数: {new_count})")
                error_reporter.set_final_result(True)
                return True
            else:
                # 投稿失敗時はログイン再実行を試行
                print("❌ 投稿に失敗しました。ログイン状態を再確認してリトライします...")
                error_reporter.add_warning("main", "投稿失敗、ログイン再試行中")
                
                # ログイン状態を再確認し、必要に応じて再ログイン
                is_logged_in_retry = check_login_status(driver)
                if not is_logged_in_retry:
                    print("🔄 ログインが切れています。再ログインを試行...")
                    is_logged_in_retry = twitter_login(driver)
                
                if is_logged_in_retry:
                    print("🔄 再ログイン成功。投稿を再試行...")
                    # 再試行時も処理時間を更新
                    elapsed_time_retry = time.time() - start_time
                    if actually_post:
                        time_info_retry = f"\n⏱️ 処理時間: {elapsed_time_retry:.2f}秒 (投稿回数: {current_count + 1}回目・再試行)"
                        enhanced_message_retry = message + time_info_retry
                    else:
                        enhanced_message_retry = message
                    success_retry = post_tweet(driver, enhanced_message_retry, None if text_only else image_path, actually_post=actually_post)
                    
                    if success_retry:
                        # 投稿回数をインクリメント
                        new_count = increment_post_count()
                        print(f"✅ 再試行で処理が正常に完了しました (投稿回数: {new_count})")
                        error_reporter.add_success("main", f"再試行成功、全処理正常完了 (投稿回数: {new_count})")
                        error_reporter.set_final_result(True)
                        return True
                    else:
                        error_msg = "再試行でもツイートの処理に失敗しました"
                        print(f"❌ {error_msg}")
                        error_reporter.add_error("main", error_msg)
                        error_reporter.set_final_result(False)
                        return False
                else:
                    error_msg = "再ログインに失敗しました"
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
        if driver and not keep_browser:
            try:
                cleanup_specific_driver(driver)
                error_reporter.add_success("cleanup", "個別ドライバークリーンアップ完了")
            except Exception as e:
                error_reporter.add_warning("cleanup", f"個別ドライバークリーンアップエラー: {e}")
                try:
                    kill_all_chromedrivers()
                except:
                    pass
        elif driver and keep_browser:
            print("🔄 ブラウザを保持します（次回投稿で再利用）")

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

def reset_tweet_count():
    """投稿回数をリセットする便利関数"""
    return reset_post_count()

def get_tweet_count():
    """現在の投稿回数を取得する便利関数"""
    return get_post_count()

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
    print("投稿回数管理:")
    print("  🔢 1回目: 投稿画面で終了（投稿ボタンは押さない）")
    print("  🔢 2回目以降: 実際に投稿実行（高速化処理適用）")
    print("  ⏱️ 処理時間測定: 2回目以降の投稿で処理時間を投稿内容に含める")
    print("  📊 投稿回数リセット: reset_tweet_count() 関数を使用")
    print("  📊 投稿回数確認: get_tweet_count() 関数を使用")
    print("  🚀 高速化: 2回目以降はIP変更・ページ遷移を最小化")
    print()
    print("推奨インストール:")
    print("  pip install pyperclip  # より確実なクリップボード操作のため")
    print()
    print("ヘルプ:")
    print("  python script.py --help")
    print("===============================================\n") 