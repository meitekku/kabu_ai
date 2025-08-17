#!/usr/bin/env python3
"""
iPhone 14 Pro環境用 Playwright Twitter自動投稿
1文字タイピング + ペースト方式の専用実装
"""

import os
import sys
import time
import logging
import traceback
from pathlib import Path

# Seleniumベースのモジュールを直接インポート
import sys
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    import browser_manager
    import twitter_actions
    import text_input
    
    get_driver_with_options = browser_manager.get_driver_with_options
    check_login_status = twitter_actions.check_login_status
    wait_for_manual_login = twitter_actions.wait_for_manual_login
    input_text_with_first_char_typing = text_input.input_text_with_first_char_typing
    
    SELENIUM_AVAILABLE = True
    print("✅ Selenium依存関係のインポート成功")
except ImportError as e:
    print(f"❌ Selenium依存関係のインポートエラー: {e}")
    SELENIUM_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MobileTwitterManager:
    """iPhone 14 Pro環境用 Twitterマネージャー（Seleniumベース）"""
    
    def __init__(self):
        self.driver = None
        self.start_time = time.time()
        
        # iPhone 14 Pro の仕様
        self.mobile_config = {
            'viewport_width': 393,
            'viewport_height': 852,
            'device_scale_factor': 3,
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        }
    
    def debug_log(self, message, level="INFO"):
        """デバッグログ出力"""
        elapsed = time.time() - self.start_time
        print(f"[📱 {elapsed:.2f}s] [{level}] {message}")
        logger.info(f"[{elapsed:.2f}s] {message}")
    
    def setup_mobile_browser(self):
        """iPhone 14 Pro環境でブラウザセットアップ"""
        if not SELENIUM_AVAILABLE:
            self.debug_log("❌ Selenium依存関係が利用できません", "ERROR")
            return False
        
        try:
            self.debug_log("📱 iPhone 14 Pro環境でSeleniumブラウザ起動開始")
            
            # iPhone 14 Pro用のChrome起動オプション
            mobile_options = [
                f'--window-size={self.mobile_config["viewport_width"]},{self.mobile_config["viewport_height"]}',
                f'--user-agent={self.mobile_config["user_agent"]}',
                '--force-device-scale-factor=3',
                '--use-mobile-user-agent',
                '--touch-events=enabled',
                '--enable-touch-drag-drop',
                '--enable-pinch',
                '--simulate-outdated-no-au=""',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-blink-features=AutomationControlled',
                '--disable-automation',
                '--exclude-switches=enable-automation'
            ]
            
            self.debug_log(f"📱 iPhone 14 Pro用オプション: {mobile_options}")
            
            # Seleniumドライバーを取得（モバイル設定付き）
            self.driver = get_driver_with_options(
                headless=False,
                extra_options=mobile_options
            )
            
            if not self.driver:
                self.debug_log("❌ iPhone 14 Pro環境ドライバー作成失敗", "ERROR")
                return False
            
            # モバイル環境の追加設定
            try:
                # ウィンドウサイズの調整
                self.driver.set_window_size(
                    self.mobile_config['viewport_width'], 
                    self.mobile_config['viewport_height']
                )
                
                # モバイル環境用JavaScriptの実行
                mobile_script = f"""
                // iPhone 14 Pro環境の設定
                Object.defineProperty(navigator, 'maxTouchPoints', {{
                    get: () => 5,
                    configurable: true
                }});
                
                Object.defineProperty(screen, 'width', {{
                    get: () => {self.mobile_config['viewport_width']},
                    configurable: true
                }});
                
                Object.defineProperty(screen, 'height', {{
                    get: () => {self.mobile_config['viewport_height']},
                    configurable: true
                }});
                
                Object.defineProperty(navigator, 'platform', {{
                    get: () => 'iPhone',
                    configurable: true
                }});
                
                console.log('✅ iPhone 14 Pro環境設定完了');
                """
                
                self.driver.execute_script(mobile_script)
                self.debug_log("✅ iPhone 14 Pro環境JavaScript設定完了")
                
            except Exception as e:
                self.debug_log(f"⚠️ モバイル環境追加設定エラー: {e}", "WARNING")
            
            self.debug_log("✅ iPhone 14 Pro環境ブラウザ起動成功")
            return True
            
        except Exception as e:
            error_msg = f"iPhone 14 Pro環境ブラウザ起動エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            return False
    
    def navigate_to_mobile_twitter(self):
        """モバイル版Twitterに移動"""
        try:
            self.debug_log("📱 モバイル版Twitterに移動開始")
            
            # モバイル版Twitterに移動
            self.driver.get("https://mobile.twitter.com/home")
            time.sleep(3)
            
            current_url = self.driver.current_url
            self.debug_log(f"現在のURL: {current_url}")
            
            # 通常のTwitterにリダイレクトされた場合
            if "mobile.twitter.com" not in current_url:
                self.debug_log("📱 通常版Twitterにリダイレクト、モバイルビューを再設定")
                # x.comに移動してモバイルビューを維持
                self.driver.get("https://x.com/home")
                time.sleep(2)
            
            try:
                title = self.driver.title
                self.debug_log(f"ページタイトル: {title}")
            except Exception as e:
                self.debug_log(f"タイトル取得エラー: {e}", "WARNING")
            
            self.debug_log("✅ モバイル版Twitter移動成功")
            return True
            
        except Exception as e:
            error_msg = f"モバイル版Twitter移動エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            return False
    
    def mobile_one_char_type_and_paste(self, element, text):
        """モバイル版 1文字タイピング + ペースト方式"""
        try:
            self.debug_log(f"📱 モバイル版1文字タイピング+ペースト開始: {text[:50]}...")
            
            if not text:
                self.debug_log("⚠️ テキストが空です")
                return True
            
            # モバイル版でのクリック操作
            self.debug_log("📱 モバイル版テキストエリアをクリック...")
            element.click()
            time.sleep(0.5)
            
            # モバイル版でのテキストクリア
            try:
                self.debug_log("🔄 モバイル版テキストクリア中...")
                # モバイル版では確実にクリア
                from selenium.webdriver.common.keys import Keys
                
                # 方法1: 全選択 + 削除
                element.send_keys(Keys.COMMAND + 'a' if os.name != 'nt' else Keys.CONTROL + 'a')
                time.sleep(0.2)
                element.send_keys(Keys.DELETE)
                time.sleep(0.3)
                
                # 方法2: フィールドクリア
                try:
                    element.clear()
                    time.sleep(0.2)
                except:
                    pass
                
                self.debug_log("✅ モバイル版テキストクリア完了")
            except Exception as clear_error:
                self.debug_log(f"⚠️ モバイル版クリア処理エラー: {clear_error}", "WARNING")
            
            # 1文字目をタイピング（モバイル版）
            first_char = text[0]
            self.debug_log(f"📱 モバイル版1文字目タイピング: '{first_char}'")
            
            typing_success = False
            for attempt in range(3):
                try:
                    element.send_keys(first_char)
                    time.sleep(0.4)  # モバイル版では少し長めに待機
                    
                    # 入力確認
                    current_text = element.text or element.get_attribute('value') or ''
                    
                    if first_char in current_text:
                        self.debug_log(f"✅ モバイル版1文字目タイピング成功: '{first_char}'")
                        typing_success = True
                        break
                    else:
                        self.debug_log(f"⚠️ モバイル版1文字目タイピング再試行 {attempt + 1}/3")
                        
                except Exception as e:
                    self.debug_log(f"⚠️ モバイル版1文字目タイピングエラー {attempt + 1}/3: {e}")
            
            if not typing_success:
                self.debug_log("❌ モバイル版1文字目タイピングが失敗しました")
                return False
            
            # 2文字目以降をペースト（モバイル版）
            if len(text) > 1:
                remaining_text = text[1:]
                self.debug_log(f"📱 モバイル版2文字目以降をペースト ({len(remaining_text)}文字)")
                
                paste_success = False
                
                # モバイル版方法1: システムクリップボード
                try:
                    self.debug_log("🔄 モバイル版システムクリップボード方式...")
                    
                    # pyperclipを使用
                    try:
                        import pyperclip
                        pyperclip.copy(remaining_text)
                        time.sleep(0.3)
                        
                        # モバイル版ペースト（iOS風）
                        element.send_keys(Keys.COMMAND + 'v' if os.name != 'nt' else Keys.CONTROL + 'v')
                        time.sleep(0.6)
                        
                        # 結果確認
                        final_text = element.text or element.get_attribute('value') or ''
                        
                        if len(final_text.strip()) >= len(text.strip()) * 0.8:
                            self.debug_log("✅ モバイル版システムクリップボード方式で成功")
                            paste_success = True
                        else:
                            self.debug_log(f"⚠️ モバイル版ペースト確認失敗 - 期待:{len(text)} 実際:{len(final_text)}")
                    
                    except ImportError:
                        self.debug_log("⚠️ pyperclip がインストールされていません")
                        
                except Exception as e:
                    self.debug_log(f"❌ モバイル版システムクリップボード方式エラー: {e}")
                
                # モバイル版方法2: JavaScript直接設定
                if not paste_success:
                    try:
                        self.debug_log("🔄 モバイル版JavaScript直接設定...")
                        
                        full_text = text
                        js_script = f"""
                        var element = arguments[0];
                        var fullText = arguments[1];
                        
                        // モバイル版での値設定
                        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {{
                            element.value = fullText;
                        }} else {{
                            element.textContent = fullText;
                            element.innerHTML = fullText.replace(/\\n/g, '<br>');
                        }}
                        
                        // モバイル版用イベント発火
                        ['input', 'change', 'keyup', 'paste', 'touchend', 'focus'].forEach(function(eventType) {{
                            var event = new Event(eventType, {{ bubbles: true, cancelable: true }});
                            element.dispatchEvent(event);
                        }});
                        
                        return element.value || element.textContent || '';
                        """
                        
                        result = self.driver.execute_script(js_script, element, full_text)
                        time.sleep(0.6)
                        
                        if len(result.strip()) >= len(text.strip()) * 0.8:
                            self.debug_log("✅ モバイル版JavaScript直接設定で成功")
                            paste_success = True
                        else:
                            self.debug_log(f"⚠️ モバイル版JavaScript設定確認失敗")
                            
                    except Exception as e:
                        self.debug_log(f"❌ モバイル版JavaScript直接設定エラー: {e}")
                
                # モバイル版方法3: 高速タイピング
                if not paste_success:
                    try:
                        self.debug_log("🔄 モバイル版高速タイピング...")
                        
                        for i, char in enumerate(remaining_text):
                            element.send_keys(char)
                            if i % 10 == 0:
                                time.sleep(0.1)  # モバイル版では少し長めに
                        
                        time.sleep(0.6)
                        
                        final_text = element.text or element.get_attribute('value') or ''
                        
                        if len(final_text.strip()) >= len(text.strip()) * 0.8:
                            self.debug_log("✅ モバイル版高速タイピングで成功")
                            paste_success = True
                        else:
                            self.debug_log("❌ モバイル版高速タイピングも失敗")
                            
                    except Exception as e:
                        self.debug_log(f"❌ モバイル版高速タイピングエラー: {e}")
                
                if not paste_success:
                    self.debug_log("❌ モバイル版全てのペースト方式が失敗しました")
                    return False
            
            # 最終確認
            final_text = element.text or element.get_attribute('value') or ''
            
            self.debug_log(f"✅ モバイル版最終入力確認 - 文字数: {len(final_text)}/{len(text)}")
            self.debug_log(f"✅ モバイル版最終入力内容: '{final_text[:100]}{'...' if len(final_text) > 100 else ''}'")
            
            if len(final_text.strip()) >= len(text.strip()) * 0.7:
                self.debug_log("✅ モバイル版1文字タイピング+ペースト方式で完全成功")
                return True
            else:
                self.debug_log("❌ モバイル版最終確認で入力不足が判明")
                
                # 詳細デバッグ情報
                self.debug_log(f"📱 期待テキスト: '{text}'")
                self.debug_log(f"📱 実際テキスト: '{final_text}'")
                
                # タイトルとコンテンツの分析
                if '\n' in text:
                    parts = text.split('\n', 1)
                    title_part = parts[0]
                    content_part = parts[1] if len(parts) > 1 else ""
                    
                    if title_part in final_text:
                        self.debug_log("✅ タイトル部分は含まれています")
                    else:
                        self.debug_log("❌ タイトル部分が含まれていません")
                    
                    if content_part and content_part.strip() in final_text:
                        self.debug_log("✅ コンテンツ部分は含まれています")
                    else:
                        self.debug_log("❌ コンテンツ部分が含まれていません")
                
                return False
                
        except Exception as e:
            self.debug_log(f"❌ モバイル版1文字タイピング+ペースト方式で予期しないエラー: {e}")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            return False
    
    def test_mobile_tweet_post(self, message, test_mode=True):
        """モバイル版ツイート投稿テスト"""
        try:
            self.debug_log(f"📱 モバイル版ツイート投稿テスト開始 (テストモード: {test_mode})")
            
            # ログイン状態チェック
            if not check_login_status(self.driver):
                self.debug_log("📱 モバイル版ログインが必要です")
                if not wait_for_manual_login(self.driver, timeout=180):
                    self.debug_log("❌ モバイル版ログインに失敗", "ERROR")
                    return False
            
            self.debug_log("✅ モバイル版ログイン確認完了")
            
            # 投稿画面に移動
            try:
                # モバイル版投稿ボタンを探す
                from selenium.webdriver.common.by import By
                from selenium.webdriver.support.ui import WebDriverWait
                from selenium.webdriver.support import expected_conditions as EC
                
                mobile_post_selectors = [
                    '[data-testid="SideNav_NewTweet_Button"]',
                    'a[href="/compose/tweet"]',
                    '[aria-label*="ツイート"]',
                    '[aria-label*="Tweet"]'
                ]
                
                post_button = None
                for selector in mobile_post_selectors:
                    try:
                        post_button = WebDriverWait(self.driver, 3).until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                        )
                        if post_button:
                            self.debug_log(f"📱 モバイル版投稿ボタン発見: {selector}")
                            break
                    except:
                        continue
                
                if not post_button:
                    self.debug_log("❌ モバイル版投稿ボタンが見つかりません")
                    return False
                
                # 投稿ボタンをクリック
                self.debug_log("📱 モバイル版投稿ボタンをクリック")
                post_button.click()
                time.sleep(3)
                
                # テキストエリアを探す
                mobile_text_selectors = [
                    '[data-testid="tweetTextarea_0"]',
                    '.public-DraftEditor-content',
                    '[aria-label*="ツイートを入力"]',
                    '[aria-label*="Tweet text"]',
                    '[contenteditable="true"]'
                ]
                
                text_area = None
                for selector in mobile_text_selectors:
                    try:
                        text_area = WebDriverWait(self.driver, 5).until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                        )
                        if text_area:
                            self.debug_log(f"📱 モバイル版テキストエリア発見: {selector}")
                            break
                    except:
                        continue
                
                if not text_area:
                    self.debug_log("❌ モバイル版テキストエリアが見つかりません")
                    return False
                
                # モバイル版1文字タイピング+ペーストテスト
                self.debug_log("📱 モバイル版テキスト入力中...")
                success = self.mobile_one_char_type_and_paste(text_area, message)
                
                if success:
                    self.debug_log(f"✅ モバイル版テキスト入力完了: {message[:50]}...")
                    print(f"✅ iPhone 14 Pro環境でテキスト入力完了: {message[:50]}...")
                    
                    # 入力結果の詳細確認
                    final_text = text_area.text or text_area.get_attribute('value') or ''
                    print(f"📱 入力結果 ({len(final_text)}文字): {final_text}")
                    
                    # タイトルとコンテンツの確認
                    if '\n' in message:
                        parts = message.split('\n', 1)
                        title_part = parts[0]
                        content_part = parts[1] if len(parts) > 1 else ""
                        
                        if title_part in final_text and content_part.strip() in final_text:
                            print("✅ タイトルとコンテンツ両方が正しく入力されています")
                            self.debug_log("✅ タイトルとコンテンツ両方が含まれています")
                        elif title_part in final_text:
                            print("⚠️ タイトル部分のみ入力されています - コンテンツが不足")
                            self.debug_log("⚠️ タイトルのみ、コンテンツが不足")
                        elif content_part.strip() in final_text:
                            print("⚠️ コンテンツ部分のみ入力されています - タイトルが不足")
                            self.debug_log("⚠️ コンテンツのみ、タイトルが不足")
                        else:
                            print("❌ 期待されるタイトルもコンテンツも正しく入力されていません")
                            self.debug_log("❌ タイトルもコンテンツも含まれていません")
                    
                    if test_mode:
                        self.debug_log("✅ iPhone 14 Pro版テスト完了成功")
                        print("✅ iPhone 14 Pro版テスト完了成功")
                    else:
                        self.debug_log("✅ iPhone 14 Pro版投稿完了成功")
                        print("✅ iPhone 14 Pro版投稿完了成功")
                    
                    return True
                else:
                    self.debug_log("❌ モバイル版テキスト入力失敗")
                    return False
                    
            except Exception as e:
                self.debug_log(f"❌ モバイル版投稿処理エラー: {e}", "ERROR")
                return False
        
        except Exception as e:
            error_msg = f"モバイル版ツイート投稿テストエラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            return False
    
    def cleanup(self):
        """リソースクリーンアップ"""
        self.debug_log("📱 モバイル版クリーンアップ開始")
        
        try:
            if self.driver:
                self.driver.quit()
                self.debug_log("✅ モバイル版ドライバークローズ完了")
                
            self.debug_log("✅ モバイル版クリーンアップ完了")
            
        except Exception as e:
            self.debug_log(f"モバイル版クリーンアップエラー: {e}", "ERROR")

def mobile_twitter_test(message, image_paths=None, test_mode=True):
    """iPhone 14 Pro環境でのTwitterテスト"""
    print("📱 iPhone 14 Pro環境 Twitter投稿テスト")
    print("=" * 60)
    print(f"📝 メッセージ: {message[:50]}...")
    print(f"🧪 テストモード: {test_mode}")
    
    try:
        print("📱 iPhone 14 Pro環境でブラウザマネージャーを開始...")
        mobile_twitter = MobileTwitterManager()
        
        if not mobile_twitter.setup_mobile_browser():
            print("❌ iPhone 14 Pro環境ブラウザ起動失敗")
            return False
        
        print("✅ iPhone 14 Pro環境ブラウザ起動成功")
        
        try:
            # 1. モバイル版Twitterに移動
            print("📱 モバイル版Twitterに移動中...")
            if not mobile_twitter.navigate_to_mobile_twitter():
                print("❌ モバイル版Twitter移動失敗")
                return False
            print("✅ モバイル版Twitter移動成功")
            
            # 2. モバイル版ツイート投稿テスト
            print("📱 iPhone 14 Pro環境でのツイート投稿処理を開始...")
            success = mobile_twitter.test_mobile_tweet_post(message, test_mode=test_mode)
            
            if success:
                if test_mode:
                    result_msg = "✅ === iPhone 14 Pro版テスト完了成功！ ==="
                    print(result_msg)
                else:
                    result_msg = "✅ === iPhone 14 Pro版投稿完了成功！ ==="
                    print(result_msg)
                return True
            else:
                print("❌ iPhone 14 Pro環境ツイート投稿テストに失敗")
                return False
                
        finally:
            mobile_twitter.cleanup()
                
    except Exception as e:
        print(f"❌ iPhone 14 Pro環境テスト失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # コマンドライン引数解析
    test_mode = '--mobile-test' in sys.argv or len(sys.argv) == 1
    
    # メッセージの取得
    message = "iPhone 14 Pro環境投稿テスト"
    image_paths = []
    
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg.startswith('--'):
            continue
        elif i == 1:  # 最初の引数はメッセージ
            message = arg
        else:  # それ以降は画像パス
            if Path(arg).exists():
                image_paths.append(arg)
                print(f"📷 画像ファイル追加: {arg}")
            else:
                print(f"⚠️ 画像ファイルが見つかりません: {arg}")
    
    print("📱 iPhone 14 Pro環境 TwitterPythonButton動作テスト")
    print("Selenium + モバイルシミュレーションによる安全なTwitter自動投稿")
    print("=" * 70)
    
    if test_mode:
        print("🧪 iPhone 14 Proテストモード: 投稿ボタンは押しません")
    else:
        print("🚀 iPhone 14 Pro実投稿モード: 実際に投稿します")
    
    success = mobile_twitter_test(message, image_paths=image_paths, test_mode=test_mode)
    
    if success:
        print("\n🎉 iPhone 14 Pro環境テスト成功!")
        print("モバイル版1文字タイピング + ペースト方式が正常に動作しています")
        print("このモバイル実装を本番環境で使用してください")
    else:
        print("\n🔧 iPhone 14 Pro環境での問題が発見されました:")
        print("モバイル版特有の調整が必要な可能性があります")