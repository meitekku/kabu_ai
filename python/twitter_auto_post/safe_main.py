#!/usr/bin/env python3
"""
システムクラッシュを防ぐ安全なTwitter自動投稿メイン処理
"""

import os
import sys
import time
import argparse
from datetime import datetime
from safe_selenium_manager import SafeSeleniumManager
from error_reporter import ErrorReporter
from config import DEFAULT_MESSAGE, DEFAULT_IMAGE_PATH

# ログ設定
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

error_reporter = ErrorReporter()

def safe_check_login_status(driver):
    """安全なログイン状態チェック"""
    try:
        logger.info("ログイン状態をチェック中...")
        
        # Twitterのホームページに移動
        driver.get("https://x.com/home")
        time.sleep(3)
        
        # ログイン状態の判定（URLベース）
        current_url = driver.current_url
        if 'home' in current_url:
            logger.info("✅ ログイン済み")
            return True
        elif 'login' in current_url or 'oauth' in current_url:
            logger.info("❌ ログインが必要")
            return False
        else:
            logger.warning(f"不明なページ: {current_url}")
            return False
            
    except Exception as e:
        logger.error(f"ログイン状態チェックエラー: {e}")
        error_reporter.add_error("login_check", str(e), e)
        return False

def safe_manual_login_wait(driver, timeout=300):
    """安全な手動ログイン待機（タイムアウト付き）"""
    try:
        logger.info("手動ログインを待機中...")
        logger.info("ブラウザでTwitterにログインしてください")
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                current_url = driver.current_url
                if 'home' in current_url:
                    logger.info("✅ 手動ログイン完了")
                    return True
                    
                # 30秒ごとに確認メッセージ
                elapsed = int(time.time() - start_time)
                if elapsed % 30 == 0 and elapsed > 0:
                    remaining = int((timeout - elapsed) / 60)
                    logger.info(f"手動ログイン待機中... 残り約{remaining}分")
                    
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"手動ログイン待機中エラー: {e}")
                time.sleep(5)
                
        logger.error("手動ログインタイムアウト")
        return False
        
    except Exception as e:
        logger.error(f"手動ログイン待機エラー: {e}")
        error_reporter.add_error("manual_login", str(e), e)
        return False

def safe_post_text(driver, message, image_path=None, actually_post=False):
    """安全なテキスト投稿"""
    try:
        logger.info("投稿処理を開始...")
        
        # 投稿ボタンを探す（複数のセレクタを試行）
        post_selectors = [
            '[aria-label*="ツイート"]',
            '[aria-label*="Tweet"]',
            '[data-testid="SideNav_NewTweet_Button"]',
            'a[href="/compose/tweet"]'
        ]
        
        post_button = None
        for selector in post_selectors:
            try:
                elements = driver.find_elements("css selector", selector)
                if elements:
                    post_button = elements[0]
                    break
            except:
                continue
                
        if not post_button:
            raise Exception("投稿ボタンが見つかりません")
            
        # 投稿エリアをクリック
        post_button.click()
        time.sleep(2)
        
        # テキストエリアを探す
        text_selectors = [
            '[data-testid="tweetTextarea_0"]',
            '.public-DraftEditor-content',
            '[aria-label*="ツイートを入力"]',
            '[aria-label*="Tweet text"]'
        ]
        
        text_area = None
        for selector in text_selectors:
            try:
                elements = driver.find_elements("css selector", selector)
                if elements:
                    text_area = elements[0]
                    break
            except:
                continue
                
        if not text_area:
            raise Exception("テキストエリアが見つかりません")
            
        # テキストを入力
        text_area.send_keys(message)
        time.sleep(2)
        
        # 画像アップロード処理
        if image_path:
            logger.info(f"📷 画像アップロード開始: {image_path}")
            try:
                # 画像アップロードボタンを探す
                media_selectors = [
                    '[aria-label*="メディア"]',
                    '[aria-label*="media"]', 
                    '[aria-label*="Media"]',
                    '[data-testid="attachments"]',
                    '[data-testid="toolbarAddMedia"]',
                    'input[type="file"][accept*="image"]'
                ]
                
                media_button = None
                for selector in media_selectors:
                    try:
                        elements = driver.find_elements("css selector", selector)
                        if elements:
                            media_button = elements[0]
                            logger.info(f"✅ 画像アップロードボタン発見: {selector}")
                            break
                    except:
                        continue
                
                if media_button:
                    # メディアボタンをクリック
                    media_button.click()
                    time.sleep(1)
                    
                    # ファイル入力要素を探す
                    file_input_selectors = [
                        'input[type="file"]',
                        'input[type="file"][accept*="image"]'
                    ]
                    
                    file_input = None
                    for selector in file_input_selectors:
                        try:
                            elements = driver.find_elements("css selector", selector)
                            if elements:
                                # 最後に追加されたファイル入力要素を使用
                                file_input = elements[-1]
                                logger.info(f"✅ ファイル入力要素発見: {selector}")
                                break
                        except:
                            continue
                    
                    if file_input:
                        # 画像ファイルをアップロード
                        file_input.send_keys(image_path)
                        logger.info(f"✅ 画像ファイル送信完了: {image_path}")
                        time.sleep(3)  # アップロード完了待機
                    else:
                        logger.warning("⚠️ ファイル入力要素が見つかりません")
                else:
                    logger.warning("⚠️ 画像アップロードボタンが見つかりません")
                    
            except Exception as upload_error:
                logger.error(f"❌ 画像アップロードエラー: {upload_error}")
                # 画像アップロードに失敗してもテキスト投稿は続行
        else:
            logger.info("📝 テキストのみ投稿")
        
        if actually_post:
            # 実際に投稿ボタンを押す
            submit_selectors = [
                '[data-testid="tweetButtonInline"]',
                '[data-testid="tweetButton"]',
                'button[type="button"]:has-text("ツイートする")',
                'button[type="button"]:has-text("Tweet")'
            ]
            
            submit_button = None
            for selector in submit_selectors:
                try:
                    elements = driver.find_elements("css selector", selector)
                    if elements:
                        submit_button = elements[0]
                        break
                except:
                    continue
                    
            if submit_button:
                submit_button.click()
                logger.info("✅ 投稿完了")
                time.sleep(3)
            else:
                logger.warning("投稿ボタンが見つからないため、テキスト入力のみ完了")
        else:
            logger.info("✅ 投稿準備完了（投稿ボタンは押しません）")
            
        return True
        
    except Exception as e:
        logger.error(f"投稿処理エラー: {e}")
        error_reporter.add_error("post_text", str(e), e)
        return False

def safe_main(message=None, image_path=None, text_only=True, actually_post=False):
    """安全なメイン処理"""
    try:
        error_reporter.add_success("safe_main", "安全なメイン処理開始")
        
        # デフォルトメッセージ設定
        if message is None:
            message = DEFAULT_MESSAGE
            
        logger.info(f"投稿メッセージ: {message[:50]}...")
        logger.info(f"画像パス: {image_path if image_path else 'なし'}")
        logger.info(f"実際に投稿: {'はい' if actually_post else 'いいえ（テスト）'}")
        
        # 画像ファイルの存在確認
        if image_path:
            if not os.path.exists(image_path):
                logger.error(f"画像ファイルが見つかりません: {image_path}")
                raise Exception(f"画像ファイルが見つかりません: {image_path}")
            else:
                logger.info(f"✅ 画像ファイル確認: {image_path}")
                # ファイルサイズも確認
                file_size = os.path.getsize(image_path)
                logger.info(f"✅ 画像ファイルサイズ: {file_size} bytes")
        
        # 安全なSeleniumマネージャーを使用
        with SafeSeleniumManager() as driver:
            # ログイン状態チェック
            is_logged_in = safe_check_login_status(driver)
            
            if not is_logged_in:
                logger.info("手動ログインが必要です")
                is_logged_in = safe_manual_login_wait(driver)
                
            if not is_logged_in:
                raise Exception("ログインに失敗しました")
                
            # 投稿処理
            success = safe_post_text(driver, message, image_path, actually_post)
            
            if success:
                logger.info("✅ 処理が正常に完了しました")
                error_reporter.add_success("safe_main", "全処理正常完了")
                error_reporter.set_final_result(True)
                return True
            else:
                raise Exception("投稿処理に失敗しました")
                
    except Exception as e:
        error_msg = f"安全なメイン処理でエラー: {e}"
        logger.error(error_msg)
        error_reporter.add_error("safe_main", error_msg, e)
        error_reporter.set_final_result(False)
        return False

def parse_arguments():
    """コマンドライン引数を解析"""
    # 🔍 引数デバッグログ追加
    print("🔍 [ARG DEBUG] safe_main.py 引数解析開始")
    print(f"🔍 [ARG DEBUG] sys.argv: {sys.argv}")
    
    parser = argparse.ArgumentParser(description='安全なTwitter自動投稿システム')
    parser.add_argument('message', nargs='?', help='投稿メッセージ')
    parser.add_argument('image_path', nargs='?', help='画像ファイルパス')
    parser.add_argument('--text-only', action='store_true', help='テキストのみ投稿')
    parser.add_argument('--actually-post', action='store_true', help='実際に投稿を実行')
    parser.add_argument('--test', action='store_true', help='テストモード（投稿ボタンは押さない）')
    
    args = parser.parse_args()
    
    # 🔍 解析結果デバッグログ
    print(f"🔍 [ARG DEBUG] 解析結果:")
    print(f"  - message: '{args.message}'")
    print(f"  - image_path: '{args.image_path}'")
    print(f"  - text_only: {args.text_only}")
    print(f"  - actually_post: {args.actually_post}")
    print(f"  - test: {args.test}")
    
    if args.image_path:
        print(f"🔍 [ARG DEBUG] 画像パス詳細:")
        print(f"  - パス: '{args.image_path}'")
        print(f"  - 存在確認: {os.path.exists(args.image_path)}")
        if os.path.exists(args.image_path):
            file_size = os.path.getsize(args.image_path)
            print(f"  - ファイルサイズ: {file_size} bytes")
        else:
            print(f"  - 絶対パス: {os.path.abspath(args.image_path)}")
            print(f"  - カレントディレクトリ: {os.getcwd()}")
    else:
        print(f"🔍 [ARG DEBUG] 画像パスなし")
    
    return args

def main():
    """エントリーポイント"""
    try:
        print("🔒 安全なTwitter自動投稿システム")
        print("=" * 50)
        
        args = parse_arguments()
        
        # 投稿メッセージ
        message = args.message if args.message else DEFAULT_MESSAGE
        
        # 画像パス
        image_path = args.image_path if hasattr(args, 'image_path') else None
        
        # 実際に投稿するかテストモードか
        actually_post = args.actually_post and not args.test
        
        if args.test:
            print("🧪 テストモード: 投稿ボタンは押しません")
        elif actually_post:
            print("🚀 実投稿モード: 実際に投稿します")
        else:
            print("📝 準備モード: 投稿準備まで行います")
            
        if image_path:
            print(f"📷 画像ファイル: {image_path}")
        else:
            print("📝 テキストのみ投稿")
            
        # 安全なメイン処理を実行
        success = safe_main(
            message=message,
            image_path=image_path,
            text_only=args.text_only,
            actually_post=actually_post
        )
        
        if success:
            print("✅ 処理完了")
            return 0
        else:
            print("❌ 処理失敗")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️ 処理が中断されました")
        return 1
    except Exception as e:
        print(f"\n❌ 予期しないエラー: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())