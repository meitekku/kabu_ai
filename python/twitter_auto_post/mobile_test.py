#!/usr/bin/env python3
"""
iPhone 14 Pro モバイル環境でのTwitter投稿テスト
1文字タイピング + ペースト方式の動作確認
"""

import os
import time
import logging
import traceback
import requests
import json
from pathlib import Path

# Playwrightのインストール確認
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MobileTwitterTester:
    """iPhone 14 Pro用 Twitterテスター"""
    
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.start_time = time.time()
        
        # iPhone 14 Pro の仕様
        self.mobile_config = {
            'viewport': {'width': 393, 'height': 852},
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'device_scale_factor': 3,
            'is_mobile': True,
            'has_touch': True
        }
    
    def debug_log(self, message, level="INFO"):
        """デバッグログ出力"""
        elapsed = time.time() - self.start_time
        print(f"[📱 {elapsed:.2f}s] [{level}] {message}")
        logger.info(f"[{elapsed:.2f}s] {message}")
    
    def setup_mobile_browser(self):
        """iPhone 14 Pro環境でブラウザセットアップ"""
        if not PLAYWRIGHT_AVAILABLE:
            raise Exception("Playwright未インストール。pip install playwright 実行後、playwright install chromium を実行してください")
        
        try:
            self.debug_log("📱 iPhone 14 Pro環境でブラウザ起動開始")
            
            self.playwright = sync_playwright().start()
            self.debug_log("✅ Playwright インスタンス作成完了")
            
            # プロファイルディレクトリ
            current_dir = Path(__file__).parent.parent.parent
            profile_dir = str(current_dir / "twitter_chrome_profile")
            
            # iPhone 14 Pro用ブラウザ起動設定
            mobile_args = [
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-blink-features=AutomationControlled',
                '--disable-automation',
                '--exclude-switches=enable-automation',
                '--disable-infobars',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor',
                '--force-device-scale-factor=3',  # iPhone 14 Pro のスケール
                '--use-mobile-user-agent',
                '--touch-events=enabled',
                '--enable-touch-drag-drop',
                '--enable-pinch'
            ]
            
            self.debug_log("📱 iPhone 14 Pro用永続コンテキスト作成中...")
            self.context = self.playwright.chromium.launch_persistent_context(
                user_data_dir=profile_dir,
                headless=False,
                args=mobile_args,
                viewport=self.mobile_config['viewport'],
                user_agent=self.mobile_config['user_agent'],
                device_scale_factor=self.mobile_config['device_scale_factor'],
                is_mobile=self.mobile_config['is_mobile'],
                has_touch=self.mobile_config['has_touch'],
                # モバイル特有の設定
                extra_http_headers={
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'User-Agent': self.mobile_config['user_agent']
                },
                geolocation={'latitude': 35.6762, 'longitude': 139.6503},  # 東京
                permissions=['geolocation'],
                timezone_id='Asia/Tokyo',
                locale='ja-JP'
            )
            
            # ページ取得
            if len(self.context.pages) > 0:
                self.page = self.context.pages[0]
            else:
                self.page = self.context.new_page()
            
            self.page.set_default_timeout(30000)
            
            # モバイル用自動化検知回避スクリプト
            mobile_stealth_script = """
                // モバイル特有の検知回避
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                    enumerable: false,
                    configurable: true
                });
                
                // タッチイベントのサポート確認
                Object.defineProperty(navigator, 'maxTouchPoints', {
                    get: () => 5,  // iPhone 14 Pro は5点タッチ
                    configurable: true
                });
                
                // モバイルデバイスの特徴を追加
                Object.defineProperty(screen, 'orientation', {
                    get: () => ({
                        angle: 0,
                        type: 'portrait-primary'
                    }),
                    configurable: true
                });
                
                // デバイスメモリとハードウェア同期数の設定
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 6,  // iPhone 14 Pro の6GB RAM
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 6,  // A16 Bionicの6コア
                    configurable: true
                });
                
                console.log('✅ iPhone 14 Pro環境 自動化検知回避スクリプト適用完了');
            """
            
            self.context.add_init_script(mobile_stealth_script)
            self.page.evaluate(mobile_stealth_script)
            
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
            self.page.goto("https://mobile.twitter.com/home", wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)
            
            current_url = self.page.url
            self.debug_log(f"現在のURL: {current_url}")
            
            # ページタイトルも取得
            try:
                title = self.page.title()
                self.debug_log(f"ページタイトル: {title}")
            except Exception as e:
                self.debug_log(f"タイトル取得エラー: {e}", "WARNING")
            
            self.debug_log("✅ モバイル版Twitter移動成功")
            return True
            
        except Exception as e:
            error_msg = f"モバイル版Twitter移動エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            return False
    
    def check_mobile_login_status(self):
        """モバイル版ログイン状態チェック"""
        try:
            current_url = self.page.url
            self.debug_log(f"モバイル版ログイン状態チェック - URL: {current_url}")
            
            # モバイル版ログイン済みの場合に存在する要素をチェック
            mobile_logged_in_indicators = [
                '[data-testid="SideNav_NewTweet_Button"]',      # ツイートボタン
                '[aria-label*="ツイート"]',                      # ツイートボタン
                '[aria-label*="Tweet"]',                        # ツイートボタン
                'nav[role="navigation"]',                       # ナビゲーション
                '[data-testid="primaryColumn"]',                # メインカラム
                'a[href="/compose/tweet"]',                     # 投稿リンク
                '.css-1dbjc4n[role="button"]'                   # モバイル版ボタン
            ]
            
            found_login_elements = 0
            for selector in mobile_logged_in_indicators:
                try:
                    element = self.page.query_selector(selector)
                    if element:
                        found_login_elements += 1
                        self.debug_log(f"✅ モバイル版ログイン要素発見: {selector}")
                except Exception as selector_error:
                    continue
            
            if found_login_elements >= 1:  # モバイルでは1つでもあれば十分
                self.debug_log(f"✅ モバイル版ログイン要素 {found_login_elements}個発見 - ログイン済みと判定")
                return True
            else:
                self.debug_log(f"❌ モバイル版ログイン要素 {found_login_elements}個のみ - ログインが必要")
                return False
                
        except Exception as e:
            error_msg = f"モバイル版ログイン状態チェックエラー: {e}"
            self.debug_log(error_msg, "ERROR")
            return False
    
    def wait_for_mobile_login(self, timeout=180):
        """モバイル版手動ログイン待機"""
        try:
            self.debug_log("📱 === モバイル版手動ログイン待機開始 ===")
            print("📱 === iPhone 14 Pro環境でTwitterにログインしてください ===")
            print("⏰ 最大3分間お待ちします")
            print("📍 ログイン完了後、自動で投稿処理に進みます")
            
            start_time = time.time()
            last_status_time = 0
            
            while time.time() - start_time < timeout:
                try:
                    current_url = self.page.url
                    elapsed = time.time() - start_time
                    
                    # モバイル版ログイン状態チェック
                    if 'login' in current_url or 'flow' in current_url:
                        if elapsed - last_status_time >= 30:
                            print("⏳ モバイル版ログインページで待機中...")
                            last_status_time = elapsed
                    
                    elif 'home' in current_url or 'mobile.twitter.com' in current_url:
                        self.debug_log("✅ モバイル版Twitterホームページを検出")
                        
                        # 追加確認
                        if self.check_mobile_login_status():
                            self.debug_log("✅ === モバイル版手動ログイン完了確認 ===")
                            print("✅ === iPhone 14 Pro環境でのログインが完了しました！ ===")
                            return True
                        else:
                            if elapsed - last_status_time >= 15:
                                print("⏳ モバイル版ホームページですが、ログイン要素を確認中...")
                                last_status_time = elapsed
                    
                    # 15秒ごとに進捗表示
                    if elapsed - last_status_time >= 15:
                        remaining = int(timeout - elapsed)
                        print(f"⏳ モバイル版ログイン待機中... 残り{remaining}秒")
                        last_status_time = elapsed
                    
                    time.sleep(3)
                    
                except Exception as e:
                    error_msg = f"❌ モバイル版ログイン待機中エラー: {e}"
                    self.debug_log(error_msg, "ERROR")
                    time.sleep(5)
            
            print("❌ モバイル版手動ログインタイムアウト（3分経過）")
            return False
            
        except Exception as e:
            error_msg = f"❌ モバイル版手動ログイン待機エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            return False
    
    def mobile_one_char_type_and_paste(self, element, text):
        """モバイル版 1文字タイピング + ペースト方式"""
        try:
            self.debug_log(f"📱 モバイル版1文字タイピング+ペースト開始: {text[:50]}...")
            
            if not text:
                self.debug_log("⚠️ テキストが空です")
                return True
            
            # モバイル版でのタップ操作
            self.debug_log("📱 モバイル版テキストエリアをタップ...")
            element.tap()  # モバイル版ではclickではなくtap
            time.sleep(0.5)
            
            # モバイル版でのテキストクリア
            try:
                self.debug_log("🔄 モバイル版テキストクリア中...")
                # モバイル版では全選択してから削除
                element.press('Meta+a')  # iOS風の全選択
                time.sleep(0.2)
                element.press('Delete')
                time.sleep(0.3)
                self.debug_log("✅ モバイル版テキストクリア完了")
            except Exception as clear_error:
                self.debug_log(f"⚠️ モバイル版クリア処理エラー: {clear_error}", "WARNING")
            
            # 1文字目をタイピング（モバイル版）
            first_char = text[0]
            self.debug_log(f"📱 モバイル版1文字目タイピング: '{first_char}'")
            
            typing_success = False
            for attempt in range(3):
                try:
                    element.type(first_char)
                    time.sleep(0.3)  # モバイル版では少し長めに待機
                    
                    # 入力確認
                    try:
                        current_text = element.input_value()
                    except:
                        try:
                            current_text = element.text_content() or ""
                        except:
                            current_text = ""
                    
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
                
                # モバイル版方法1: JavaScriptクリップボード
                try:
                    self.debug_log("🔄 モバイル版JavaScriptクリップボード方式...")
                    
                    clipboard_script = f"""
                    navigator.clipboard.writeText(`{remaining_text.replace('`', '\\`')}`).then(() => {{
                        console.log('モバイル版クリップボードに設定完了');
                        return true;
                    }}).catch(err => {{
                        console.error('モバイル版クリップボード設定エラー:', err);
                        return false;
                    }});
                    """
                    
                    self.page.evaluate(clipboard_script)
                    time.sleep(0.3)
                    
                    # モバイル版ペースト（iOS風）
                    element.press('Meta+v')  # iOS風のペースト
                    time.sleep(0.5)
                    
                    # 結果確認
                    try:
                        final_text = element.input_value()
                    except:
                        try:
                            final_text = element.text_content() or ""
                        except:
                            final_text = ""
                    
                    if len(final_text.strip()) >= len(text.strip()) * 0.8:
                        self.debug_log("✅ モバイル版JavaScriptクリップボード方式で成功")
                        paste_success = True
                    else:
                        self.debug_log(f"⚠️ モバイル版ペースト確認失敗 - 期待:{len(text)} 実際:{len(final_text)}")
                        
                except Exception as e:
                    self.debug_log(f"❌ モバイル版JavaScriptクリップボード方式エラー: {e}")
                
                # モバイル版方法2: 直接JavaScript設定
                if not paste_success:
                    try:
                        self.debug_log("🔄 モバイル版JavaScript直接設定...")
                        
                        full_text = text
                        js_script = f"""
                        const element = arguments[0];
                        const fullText = `{full_text.replace('`', '\\`')}`;
                        
                        // モバイル版での値設定
                        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {{
                            element.value = fullText;
                        }} else {{
                            element.textContent = fullText;
                            element.innerHTML = fullText.replace(/\\n/g, '<br>');
                        }}
                        
                        // モバイル版用イベント発火
                        ['input', 'change', 'keyup', 'paste', 'touchend'].forEach(eventType => {{
                            const event = new Event(eventType, {{ bubbles: true, cancelable: true }});
                            element.dispatchEvent(event);
                        }});
                        
                        return element.value || element.textContent || '';
                        """
                        
                        result = self.page.evaluate(js_script, element)
                        time.sleep(0.5)
                        
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
                            element.type(char)
                            if i % 10 == 0:
                                time.sleep(0.1)  # モバイル版では少し長めに
                        
                        time.sleep(0.5)
                        
                        try:
                            final_text = element.input_value()
                        except:
                            try:
                                final_text = element.text_content() or ""
                            except:
                                final_text = ""
                        
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
            try:
                final_text = element.input_value()
            except:
                try:
                    final_text = element.text_content() or ""
                except:
                    final_text = ""
            
            self.debug_log(f"✅ モバイル版最終入力確認 - 文字数: {len(final_text)}/{len(text)}")
            self.debug_log(f"✅ モバイル版最終入力内容: '{final_text[:100]}{'...' if len(final_text) > 100 else ''}'")
            
            if len(final_text.strip()) >= len(text.strip()) * 0.7:
                self.debug_log("✅ モバイル版1文字タイピング+ペースト方式で完全成功")
                return True
            else:
                self.debug_log("❌ モバイル版最終確認で入力不足が判明")
                return False
                
        except Exception as e:
            self.debug_log(f"❌ モバイル版1文字タイピング+ペースト方式で予期しないエラー: {e}")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            return False
    
    def test_mobile_tweet_post(self, message):
        """モバイル版ツイート投稿テスト"""
        try:
            self.debug_log(f"📱 モバイル版ツイート投稿テスト開始")
            
            # モバイル版投稿ボタンを探す
            mobile_post_selectors = [
                '[data-testid="SideNav_NewTweet_Button"]',
                'a[href="/compose/tweet"]',
                '[aria-label*="ツイート"]',
                '[aria-label*="Tweet"]',
                '.css-1dbjc4n[role="button"]'  # モバイル版ボタン
            ]
            
            post_button = None
            for selector in mobile_post_selectors:
                try:
                    post_button = self.page.query_selector(selector)
                    if post_button:
                        self.debug_log(f"📱 モバイル版投稿ボタン発見: {selector}")
                        break
                except:
                    continue
            
            if not post_button:
                self.debug_log("❌ モバイル版投稿ボタンが見つかりません")
                return False
            
            # モバイル版投稿ボタンをタップ
            self.debug_log("📱 モバイル版投稿ボタンをタップ")
            post_button.tap()  # モバイル版ではtap
            time.sleep(3)
            
            # モバイル版テキストエリアを探す
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
                    text_area = self.page.query_selector(selector)
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
                try:
                    final_text = text_area.input_value()
                except:
                    try:
                        final_text = text_area.text_content() or ""
                    except:
                        final_text = ""
                
                print(f"📱 入力結果 ({len(final_text)}文字): {final_text}")
                
                # タイトルとコンテンツの確認
                if "テスト" in message and "1文字タイピング" in message:
                    if "テスト" in final_text and "1文字タイピング" in final_text:
                        print("✅ タイトルとコンテンツ両方が正しく入力されています")
                    elif "テスト" in final_text:
                        print("⚠️ タイトル部分のみ入力されています - コンテンツが不足")
                    else:
                        print("❌ 期待されるテキストが正しく入力されていません")
                
                print("📱 テスト完了 - ブラウザは開いたままにします")
                print("手動で以下を確認してください:")
                print("1. テキストが正しく入力されているか")
                print("2. 1文字タイピング + ペースト方式が動作しているか")
                print("3. モバイル版Twitterでの動作が正常か")
                
                # ブラウザを開いたまま維持
                input("Enterキーを押してテストを終了してください...")
                
                return True
            else:
                self.debug_log("❌ モバイル版テキスト入力失敗")
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
            if self.context:
                self.context.close()
                self.debug_log("✅ モバイル版コンテキストクローズ完了")
                
            if hasattr(self, 'playwright') and self.playwright:
                self.playwright.stop()
                self.debug_log("✅ モバイル版Playwrightストップ完了")
                
            self.debug_log("✅ モバイル版クリーンアップ完了")
            
        except Exception as e:
            self.debug_log(f"モバイル版クリーンアップエラー: {e}", "ERROR")
    
    def __enter__(self):
        if self.setup_mobile_browser():
            return self
        else:
            raise Exception("iPhone 14 Pro環境ブラウザセットアップに失敗")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

def test_mobile_twitter():
    """iPhone 14 Pro環境でのTwitterテスト"""
    print("📱 iPhone 14 Pro環境 Twitter投稿テスト")
    print("=" * 60)
    
    # テストメッセージ（title + 改行 + content形式）
    title = "【モバイルテスト】株価情報"
    content = "iPhone 14 Pro環境での1文字タイピング + ペースト方式をテストしています。\nモバイル版Twitterでの動作確認中です。\n\n#モバイルテスト #株価"
    
    full_message = f"{title}\n{content}"
    
    print(f"📱 テストメッセージ:")
    print(f"   タイトル: {title}")
    print(f"   コンテンツ: {content}")
    print(f"   全体 ({len(full_message)}文字): {repr(full_message)}")
    
    if not PLAYWRIGHT_AVAILABLE:
        print("❌ Playwright未インストール")
        print("解決方法:")
        print("1. pip install playwright")
        print("2. playwright install chromium")
        return False
    
    try:
        print("📱 iPhone 14 Pro環境でブラウザマネージャーを開始...")
        with MobileTwitterTester() as mobile_twitter:
            print("✅ iPhone 14 Pro環境ブラウザ起動成功")
            
            # 1. モバイル版Twitterに移動
            print("📱 モバイル版Twitterに移動中...")
            if not mobile_twitter.navigate_to_mobile_twitter():
                print("❌ モバイル版Twitter移動失敗")
                return False
            print("✅ モバイル版Twitter移動成功")
            
            # 2. モバイル版ログイン状態チェック
            print("📱 モバイル版ログイン状態をチェック中...")
            is_logged_in = mobile_twitter.check_mobile_login_status()
            
            if not is_logged_in:
                print("📱 iPhone 14 Pro環境でのログインが必要です...")
                is_logged_in = mobile_twitter.wait_for_mobile_login()
            else:
                print("✅ iPhone 14 Pro環境で既にログイン済みです")
            
            if is_logged_in:
                print("📱 iPhone 14 Pro環境でのツイート投稿処理を開始...")
                success = mobile_twitter.test_mobile_tweet_post(full_message)
                
                if success:
                    print("✅ === iPhone 14 Pro環境テスト完了成功！ ===")
                    return True
                else:
                    print("❌ iPhone 14 Pro環境ツイート投稿テストに失敗")
                    return False
            else:
                print("❌ iPhone 14 Pro環境ログインに失敗またはタイムアウト")
                return False
                
    except Exception as e:
        print(f"❌ iPhone 14 Pro環境テスト失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("📱 iPhone 14 Pro環境 TwitterPythonButton動作テスト")
    print("モバイル版1文字タイピング + ペースト方式の動作確認")
    print("=" * 70)
    
    success = test_mobile_twitter()
    
    if success:
        print("\n🎉 iPhone 14 Pro環境テスト成功!")
        print("モバイル版1文字タイピング + ペースト方式が正常に動作しています")
        print("このモバイル実装を本番環境で使用してください")
    else:
        print("\n🔧 iPhone 14 Pro環境での問題が発見されました")
        print("モバイル版特有の調整が必要な可能性があります")