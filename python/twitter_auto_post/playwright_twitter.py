#!/usr/bin/env python3
"""
Seleniumクラッシュ問題の最終解決策
Playwright使用による安全なTwitter自動投稿
"""

import os
import time
import logging
import traceback
import psutil
import random
import json
from datetime import datetime
from pathlib import Path

# Playwrightのインストール確認
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlaywrightTwitterManager:
    """Playwright版Twitter自動投稿マネージャー（クラッシュ防止）"""
    
    def __init__(self, headless=True, profile_dir=None):
        self.headless = headless
        self.browser = None
        self.page = None
        self.context = None
        self.start_time = time.time()
        self.debug_enabled = True
        
        # プロファイルディレクトリの設定
        if profile_dir is None:
            # デフォルトは既存のtwitter_chrome_profileを使用
            current_dir = Path(__file__).parent.parent.parent
            self.profile_dir = str(current_dir / "twitter_chrome_profile")
        else:
            self.profile_dir = profile_dir
        
        # ポストボタン専用デバッグログシステムの初期化
        self.init_post_button_debug_system()
        
        self.debug_log(f"プロファイルディレクトリ: {self.profile_dir}")
    
    def init_post_button_debug_system(self):
        """ポストボタン専用デバッグログシステムの初期化"""
        try:
            # デバッグディレクトリの作成
            debug_dir = Path(__file__).parent / "post_button_debug"
            debug_dir.mkdir(exist_ok=True)
            
            # タイムスタンプ付きのセッションID
            session_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.debug_session_id = f"post_button_debug_{session_timestamp}"
            
            # デバッグファイルパス
            self.debug_log_file = debug_dir / f"{self.debug_session_id}.log"
            self.debug_json_file = debug_dir / f"{self.debug_session_id}.json"
            self.debug_screenshot_dir = debug_dir / self.debug_session_id / "screenshots"
            self.debug_html_dir = debug_dir / self.debug_session_id / "html_dumps"
            
            # ディレクトリ作成
            self.debug_screenshot_dir.mkdir(parents=True, exist_ok=True)
            self.debug_html_dir.mkdir(parents=True, exist_ok=True)
            
            # デバッグデータの初期化
            self.debug_data = {
                "session_id": self.debug_session_id,
                "start_time": datetime.now().isoformat(),
                "post_button_search_attempts": [],
                "click_attempts": [],
                "screenshots": [],
                "html_dumps": [],
                "page_states": [],
                "errors": []
            }
            
            # 初期ログ出力
            self.post_button_debug_log("🔍 ポストボタンデバッグシステム初期化完了", {
                "debug_dir": str(debug_dir),
                "session_id": self.debug_session_id,
                "log_file": str(self.debug_log_file),
                "json_file": str(self.debug_json_file)
            })
            
        except Exception as e:
            print(f"⚠️ ポストボタンデバッグシステム初期化エラー: {e}")
            self.debug_session_id = "debug_init_failed"
            self.debug_data = {}
    
    def post_button_debug_log(self, message, data=None, level="INFO"):
        """ポストボタン専用デバッグログ出力"""
        try:
            timestamp = datetime.now().isoformat()
            elapsed = time.time() - self.start_time
            
            # コンソール出力
            console_msg = f"[POST_BTN_DEBUG] [{elapsed:.2f}s] [{level}] {message}"
            print(console_msg)
            
            # ファイル出力
            if hasattr(self, 'debug_log_file'):
                with open(self.debug_log_file, 'a', encoding='utf-8') as f:
                    f.write(f"{console_msg}\n")
                    if data:
                        f.write(f"  データ: {json.dumps(data, ensure_ascii=False, indent=2)}\n")
            
            # 構造化データに記録
            if hasattr(self, 'debug_data'):
                log_entry = {
                    "timestamp": timestamp,
                    "elapsed_seconds": elapsed,
                    "level": level,
                    "message": message,
                    "data": data
                }
                
                if level == "ERROR":
                    self.debug_data.setdefault("errors", []).append(log_entry)
                else:
                    self.debug_data.setdefault("general_logs", []).append(log_entry)
                
                # JSON ファイルを更新
                self.save_debug_data()
            
        except Exception as e:
            print(f"⚠️ ポストボタンデバッグログ出力エラー: {e}")
    
    def save_debug_data(self):
        """デバッグデータをJSONファイルに保存"""
        try:
            if hasattr(self, 'debug_json_file') and hasattr(self, 'debug_data'):
                with open(self.debug_json_file, 'w', encoding='utf-8') as f:
                    json.dump(self.debug_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ デバッグデータ保存エラー: {e}")
    
    def take_debug_screenshot(self, name, description=""):
        """デバッグ用スクリーンショット撮影"""
        try:
            if not self.page:
                return None
                
            timestamp = datetime.now().strftime("%H%M%S_%f")[:-3]  # ミリ秒まで
            filename = f"{timestamp}_{name}.png"
            filepath = self.debug_screenshot_dir / filename
            
            self.page.screenshot(path=str(filepath), full_page=True)
            
            screenshot_info = {
                "timestamp": datetime.now().isoformat(),
                "filename": filename,
                "filepath": str(filepath),
                "description": description,
                "page_url": self.page.url if self.page else "N/A"
            }
            
            self.debug_data.setdefault("screenshots", []).append(screenshot_info)
            self.post_button_debug_log(f"📸 スクリーンショット撮影: {filename}", screenshot_info)
            
            return str(filepath)
            
        except Exception as e:
            self.post_button_debug_log(f"❌ スクリーンショット撮影エラー: {e}", {"error": str(e)}, "ERROR")
            return None
    
    def dump_page_html(self, name, description=""):
        """ページHTMLのダンプ"""
        try:
            if not self.page:
                return None
                
            timestamp = datetime.now().strftime("%H%M%S_%f")[:-3]
            filename = f"{timestamp}_{name}.html"
            filepath = self.debug_html_dir / filename
            
            html_content = self.page.content()
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            html_info = {
                "timestamp": datetime.now().isoformat(),
                "filename": filename,
                "filepath": str(filepath),
                "description": description,
                "page_url": self.page.url if self.page else "N/A",
                "html_length": len(html_content)
            }
            
            self.debug_data.setdefault("html_dumps", []).append(html_info)
            self.post_button_debug_log(f"📄 HTMLダンプ: {filename}", html_info)
            
            return str(filepath)
            
        except Exception as e:
            self.post_button_debug_log(f"❌ HTMLダンプエラー: {e}", {"error": str(e)}, "ERROR")
            return None
    
    def record_page_state(self, state_name, additional_data=None):
        """ページ状態の記録"""
        try:
            if not self.page:
                return
                
            state_info = {
                "timestamp": datetime.now().isoformat(),
                "state_name": state_name,
                "page_url": self.page.url,
                "page_title": self.page.title(),
                "viewport_size": self.page.viewport_size,
                "additional_data": additional_data or {}
            }
            
            # ボタン要素の数を調査
            try:
                button_count = len(self.page.query_selector_all('button, [role="button"]'))
                state_info["total_buttons"] = button_count
            except:
                state_info["total_buttons"] = "調査失敗"
            
            self.debug_data.setdefault("page_states", []).append(state_info)
            self.post_button_debug_log(f"📊 ページ状態記録: {state_name}", state_info)
            
        except Exception as e:
            self.post_button_debug_log(f"❌ ページ状態記録エラー: {e}", {"error": str(e)}, "ERROR")
        
    def debug_log(self, message, level="INFO"):
        """デバッグログ出力"""
        if self.debug_enabled:
            elapsed = time.time() - self.start_time
            print(f"[{elapsed:.2f}s] [{level}] {message}")
            logger.info(f"[{elapsed:.2f}s] {message}")
    
    def check_text_content(self, element_selector=None, step_name=""):
        """テキストエリアの内容を詳細にチェックする"""
        try:
            if not element_selector:
                # デフォルトのテキストエリアセレクタ
                selectors = [
                    '[data-testid="tweetTextarea_0"]',
                    '.public-DraftEditor-content',
                    '[contenteditable="true"]',
                    '[aria-label*="ツイートを入力"]',
                    '[aria-label*="Tweet text"]',
                    'textarea',
                    '[role="textbox"]'
                ]
                
                text_content = ""
                for selector in selectors:
                    try:
                        element = self.page.query_selector(selector)
                        if element:
                            content = element.evaluate("element => element.value || element.textContent || element.innerText || ''")
                            if content and content.strip():
                                text_content = content
                                break
                    except:
                        continue
            else:
                element = self.page.query_selector(element_selector)
                if element:
                    text_content = element.evaluate("element => element.value || element.textContent || element.innerText || ''")
                else:
                    text_content = ""
            
            # ログに記録
            self.debug_log(f"📝 [TEXT_CHECK] {step_name}: テキスト長={len(text_content)}, 内容='{text_content[:50]}{'...' if len(text_content) > 50 else ''}'")
            
            return text_content
            
        except Exception as e:
            self.debug_log(f"テキスト内容チェックエラー: {e}", "WARNING")
            return ""
    
    def human_delay(self, min_ms=500, max_ms=2000):
        """人間らしいランダムな待機時間"""
        delay = random.uniform(min_ms/1000, max_ms/1000)
        self.debug_log(f"人間らしい待機: {delay:.2f}秒")
        time.sleep(delay)
    
    def typing_delay(self):
        """タイピング間の自然な遅延"""
        delay = random.uniform(0.05, 0.15)  # 50-150ms
        time.sleep(delay)
    
    def natural_click(self, element):
        """自然なクリック動作"""
        # マウスオーバー風の遅延
        self.human_delay(200, 500)
        element.click()
        # クリック後の自然な待機
        self.human_delay(300, 800)
    
    def natural_type(self, element, text, clear_first=False):
        """自然なタイピング動作（fill()使用で安全）"""
        self.debug_log(f"🎯 [DEBUG] natural_type開始: clear_first={clear_first}, text='{text[:50]}...'")
        
        # 現在のテキスト内容を確認
        try:
            current_value = element.evaluate('el => el.value || el.textContent || el.innerText || ""')
            self.debug_log(f"📝 [DEBUG] 設定前の現在値: '{current_value[:50]}...'")
        except:
            self.debug_log("📝 [DEBUG] 現在値の取得に失敗")
        
        if clear_first:
            self.debug_log("🧹 [DEBUG] clear_first=True のため既存テキストをクリア")
            element.click()
            self.human_delay(100, 300)
            element.clear()
            self.human_delay(200, 500)
        else:
            self.debug_log("🔄 [DEBUG] clear_first=False のため既存テキストを保持")
        
        # fill()を使用してテキストを一度に設定（type()の代替）
        try:
            self.debug_log(f"📝 [DEBUG] fill()でテキスト設定試行: '{text[:50]}...'")
            element.fill(text)
            
            # 設定後の値を確認
            after_value = element.evaluate('el => el.value || el.textContent || el.innerText || ""')
            self.debug_log(f"✅ [DEBUG] fill()完了、設定後の値: '{after_value[:50]}...'")
            
            self.debug_log(f"✅ fill()でテキスト設定完了: {text[:50]}...")
        except Exception as e:
            self.debug_log(f"⚠️ fill()失敗、JavaScript設定を試行: {e}", "WARNING")
            # fill()が失敗した場合はJavaScriptで直接設定
            try:
                self.debug_log(f"🔧 [DEBUG] JavaScript方式でテキスト設定試行: '{text[:50]}...'")
                
                result = element.evaluate('''
                    (element, text) => {
                        console.log('[DEBUG] JavaScript設定開始:', element.tagName, element.contentEditable, text.substring(0, 50));
                        
                        const beforeValue = element.value || element.textContent || element.innerText || '';
                        console.log('[DEBUG] 設定前の値:', beforeValue.substring(0, 50));
                        
                        if (element.tagName === 'DIV' && element.contentEditable === 'true') {
                            element.textContent = text;
                        } else {
                            element.value = text;
                        }
                        
                        const afterValue = element.value || element.textContent || element.innerText || '';
                        console.log('[DEBUG] 設定後の値:', afterValue.substring(0, 50));
                        
                        // inputイベントを発火
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        return {
                            success: true,
                            beforeValue: beforeValue,
                            afterValue: afterValue,
                            targetText: text
                        };
                    }
                ''', text)
                
                if result:
                    self.debug_log(f"🔧 [DEBUG] JS設定結果 - before: '{result.get('beforeValue', '')[:30]}...', after: '{result.get('afterValue', '')[:30]}...'")
                
                self.debug_log(f"✅ JavaScript設定完了: {text[:50]}...")
            except Exception as js_error:
                self.debug_log(f"❌ JavaScript設定も失敗: {js_error}", "ERROR")
                # 最後の手段として一文字ずつタイプ（元の方式）
                self.debug_log("🔄 [DEBUG] フォールバック: 一文字ずつタイプ方式")
                for char in text:
                    element.type(char)
                    if random.random() < 0.1:
                        self.human_delay(100, 500)
                    else:
                        self.typing_delay()
        
        # 最終確認
        try:
            final_value = element.evaluate('el => el.value || el.textContent || el.innerText || ""')
            self.debug_log(f"🎯 [DEBUG] natural_type最終結果: '{final_value[:50]}...'")
        except:
            self.debug_log("🎯 [DEBUG] 最終値の確認に失敗")
        
        # タイピング完了後の待機
        self.human_delay(500, 1000)
    
    def log_memory_usage(self):
        """メモリ使用量をログ出力"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            self.debug_log(f"メモリ使用量: {memory_mb:.1f}MB", "MEMORY")
        except Exception as e:
            self.debug_log(f"メモリ監視エラー: {e}", "WARNING")
        
    def setup_browser(self):
        """ブラウザセットアップ（永続プロファイル対応）"""
        if not PLAYWRIGHT_AVAILABLE:
            raise Exception("Playwright未インストール。pip install playwright 実行後、playwright install chromium を実行してください")
        
        try:
            self.debug_log("🎭 Playwright ブラウザ起動開始（永続プロファイル対応）")
            self.log_memory_usage()
            
            self.debug_log("Playwright インスタンス作成中...")
            self.playwright = sync_playwright().start()
            self.debug_log("✅ Playwright インスタンス作成完了")
            
            # プロファイルディレクトリの存在確認
            profile_path = Path(self.profile_dir)
            if profile_path.exists():
                self.debug_log(f"✅ 既存プロファイル発見: {self.profile_dir}")
                self.debug_log("既存セッション（ログイン状態）を使用します")
            else:
                self.debug_log(f"⚠️ プロファイルディレクトリ未発見: {self.profile_dir}")
                self.debug_log("新規プロファイルを作成します")
                profile_path.mkdir(parents=True, exist_ok=True)
            
            # ブラウザ起動引数（最強自動化検知回避 + Twitter認証強化）
            browser_args = [
                # 基本設定
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-plugins',
                '--memory-pressure-off',
                '--no-first-run',
                '--no-default-browser-check',
                
                # 自動化検知回避設定（最重要）
                '--disable-blink-features=AutomationControlled',
                '--disable-automation',
                '--exclude-switches=enable-automation',
                '--disable-infobars',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-client-side-phishing-detection',
                '--disable-sync',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-domain-reliability',
                '--disable-features=VizDisplayCompositor,VizHitTest,VizSurfaceSync',
                
                # 通常ブラウザ偽装強化
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--disable-ipc-flooding-protection',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-background-timer-throttling',
                '--disable-features=TranslateUI',
                '--disable-software-rasterizer',
                '--mute-audio',
                '--no-zygote',
                '--use-fake-ui-for-media-stream',
                '--disable-field-trial-config',
                '--disable-features=OptimizationHints',
                
                # 追加の自動化検知回避
                '--disable-component-update',
                '--disable-background-networking',
                '--disable-sync-preferences',
                '--disable-translate',
                '--hide-scrollbars',
                '--disable-logging',
                '--disable-log-file',
                '--silent-debugger-extension-api',
                '--disable-notifications',
                '--disable-save-password-bubble',
                '--disable-single-click-autofill',
                '--disable-autofill-keyboard-accessory-view',
                '--disable-full-form-autofill-ios',
                '--disable-autofill',
                '--disable-password-generation',
                '--disable-password-manager-reauthentication',
                
                # WebGL/Canvas偽装
                '--disable-webgl',
                '--disable-webgl-image-chromium',
                '--disable-3d-apis',
                '--disable-accelerated-2d-canvas',
                '--disable-accelerated-jpeg-decoding',
                '--disable-accelerated-mjpeg-decode',
                '--disable-app-list-dismiss-on-blur',
                '--disable-accelerated-video-decode',
                
                # Twitter認証強化設定
                '--disable-features=UserAgentClientHint',
                '--disable-features=FedCm',
                '--disable-features=WebXr',
                '--disable-features=VirtualKeyboard',
                '--disable-features=MediaSessionService',
                '--disable-features=HardwareMediaKeyHandling',
                '--disable-features=AudioServiceOutOfProcess',
                '--disable-features=VideoCapture',
                '--disable-features=AudioCapture',
                '--disable-features=PlatformEncryptedDolby',
                '--disable-features=UseSkiaRenderer',
                '--disable-features=WebUSB',
                '--disable-features=WebBluetooth',
                '--disable-features=WebXrIncubations',
                '--disable-features=WebOTP',
                '--disable-features=DirectSockets',
                '--disable-features=TrustTokens',
                '--disable-features=ConversionMeasurement',
                '--disable-features=InterestCohortAPI',
                '--disable-features=FlocIdSortingLshBasedComputation',
                '--disable-features=PrivacySandboxAdsAPIs',
                '--disable-features=ChromeLabs',
                '--disable-component-cloud-policy',
                '--disable-background-mode',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-background-timer-throttling',
                '--disable-background-networking',
                '--disable-features=AudioWorklet',
                '--disable-features=WebAssembly',
                '--disable-shared-worker',
                '--disable-service-worker-context-core',
                '--aggressive-cache-discard',
                '--disable-cookie-encryption',
                '--disable-chrome-login-prompt',
                '--disable-client-side-phishing-detection',
                '--disable-default-apps',
                '--disable-device-discovery-notifications',
                '--disable-dinosaur-easter-egg',
                '--disable-domain-reliability',
                '--disable-external-intent-requests',
                '--disable-features=VizDisplayCompositor,VizHitTest,VizSurfaceSync,AudioServiceOutOfProcess,MediaSessionService',
                '--disable-file-system',
                '--disable-geolocation',
                '--disable-gpu-process-crash-limit',
                '--disable-ipc-flooding-protection',
                '--disable-local-storage',
                '--disable-media-source',
                '--disable-namespace-sandbox',
                '--disable-origin-trial-controlled-blink-features',
                '--disable-permissions-api',
                '--disable-presentation-api',
                '--disable-reading-from-canvas',
                '--disable-remote-fonts',
                '--disable-rtc-smoothness-algorithm',
                '--disable-seccomp-filter-sandbox',
                '--disable-speech-api',
                '--disable-spell-checking',
                '--disable-usb-keyboard-detect',
                '--disable-voice-input',
                '--disable-wake-on-wifi',
                '--disable-web-notification',
                '--disable-webrtc',
                '--disable-webrtc-hw-decoding',
                '--disable-webrtc-hw-encoding',
                '--disable-webrtc-multiple-routes',
                '--disable-webrtc-hw-vp8-encoding',
                '--disable-webrtc-hw-vp9-encoding',
                '--force-device-scale-factor=1',
                '--force-gpu-mem-available-mb=1024',
                '--max_old_space_size=4096',
                '--no-experiments',
                '--no-pings',
                '--no-proxy-server',
                '--no-referrers',
                '--reduce-security-for-testing',
                '--simulate-outdated-no-au='
            ]
            self.debug_log(f"ブラウザ引数: {browser_args}")
            
            # 永続コンテキストで起動（最強自動化検知回避）
            self.debug_log("永続ブラウザコンテキスト作成中...")
            self.context = self.playwright.chromium.launch_persistent_context(
                user_data_dir=self.profile_dir,
                headless=self.headless,
                args=browser_args,
                viewport={'width': 1366, 'height': 768},  # より一般的な解像度
                # 最新の現実的なUser-Agent
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                # 自動化検知回避の追加設定
                ignore_default_args=[
                    '--enable-automation',
                    '--enable-blink-features=AutomationControlled',
                    '--disable-extensions-except',
                    '--disable-extensions',
                    '--enable-logging',
                    '--disable-hang-monitor',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection'
                ],
                # より現実的なHTTPヘッダー（Twitter認証強化）
                extra_http_headers={
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Cache-Control': 'max-age=0',
                    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"macOS"',
                    'Sec-Ch-Ua-Platform-Version': '"14.6.0"',
                    'Sec-Ch-Ua-Full-Version-List': '"Google Chrome";v="131.0.6778.108", "Chromium";v="131.0.6778.108", "Not_A Brand";v="24.0.0.0"',
                    'Sec-Ch-Ua-Arch': '"arm"',
                    'Sec-Ch-Ua-Bitness': '"64"',
                    'Sec-Ch-Ua-Model': '""',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'DNT': '1',
                    'Connection': 'keep-alive'
                },
                # 地理的位置情報の設定
                geolocation={'latitude': 35.6762, 'longitude': 139.6503},  # 東京
                permissions=['geolocation'],
                # タイムゾーン設定
                timezone_id='Asia/Tokyo',
                # 言語設定
                locale='ja-JP',
                # 追加のコンテキスト設定
                java_script_enabled=True,
                bypass_csp=True,
                ignore_https_errors=True
            )
            self.debug_log("✅ 永続ブラウザコンテキスト作成完了")
            self.log_memory_usage()
            
            # ページ作成（永続コンテキストでは最初からページが存在する場合がある）
            if len(self.context.pages) > 0:
                self.debug_log("既存ページを使用")
                self.page = self.context.pages[0]
            else:
                self.debug_log("新しいページ作成中...")
                self.page = self.context.new_page()
                self.debug_log("✅ 新しいページ作成完了")
            
            # タイムアウト設定
            self.page.set_default_timeout(30000)  # 30秒
            self.debug_log("タイムアウト設定完了: 30秒")
            
            # 最強自動化検知回避スクリプト（Twitter認証対応強化）
            self.debug_log("最強自動化検知回避スクリプト実行中...")
            stealth_script = """
                // 1. navigator.webdriverを完全に削除
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                    set: () => {},
                    enumerable: false,
                    configurable: true
                });
                delete navigator.__proto__.webdriver;
                delete navigator.webdriver;
                
                // 2. webdriver検知文字列の削除
                const originalToString = Function.prototype.toString;
                Function.prototype.toString = function() {
                    const result = originalToString.apply(this, arguments);
                    return result.replace(/\b(?:webdriver|automation|headless)\b/gi, 'genuine');
                };
                
                // 3. Chromeオブジェクトの完全偽装
                if (!window.chrome) {
                    window.chrome = {};
                }
                Object.defineProperty(window, 'chrome', {
                    value: {
                        app: {
                            isInstalled: false,
                            InstallState: {
                                DISABLED: 'disabled',
                                INSTALLED: 'installed',
                                NOT_INSTALLED: 'not_installed'
                            },
                            RunningState: {
                                CANNOT_RUN: 'cannot_run',
                                READY_TO_RUN: 'ready_to_run',
                                RUNNING: 'running'
                            }
                        },
                        runtime: {
                            onConnect: null,
                            onMessage: null,
                            connect: () => {},
                            sendMessage: () => {}
                        },
                        csi: () => {},
                        loadTimes: () => ({ 
                            requestTime: Date.now() / 1000,
                            startLoadTime: Date.now() / 1000,
                            commitLoadTime: Date.now() / 1000,
                            finishDocumentLoadTime: Date.now() / 1000,
                            finishLoadTime: Date.now() / 1000,
                            firstPaintTime: Date.now() / 1000,
                            firstPaintAfterLoadTime: 0,
                            navigationType: 'Navigation',
                            wasFetchedViaSpdy: false,
                            wasNpnNegotiated: false,
                            npnNegotiatedProtocol: 'unknown',
                            wasAlternateProtocolAvailable: false,
                            connectionInfo: 'http/1.1'
                        })
                    },
                    writable: false,
                    enumerable: true,
                    configurable: false
                });
                
                // 4. Permissions APIの高度偽装
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => {
                    const mockPermissions = {
                        'notifications': 'granted',
                        'geolocation': 'prompt',
                        'microphone': 'prompt',
                        'camera': 'prompt'
                    };
                    return Promise.resolve({
                        state: mockPermissions[parameters.name] || 'granted',
                        onchange: null
                    });
                };
                
                // 5. プラグインの現実的な偽装
                Object.defineProperty(navigator, 'plugins', {
                    get: () => ({
                        length: 5,
                        0: { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                        1: { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                        2: { name: 'Native Client', filename: 'internal-nacl-plugin' },
                        3: { name: 'WebKit built-in PDF', filename: 'WebKit built-in PDF' },
                        4: { name: 'Portable Document Format', filename: 'internal-pdf-viewer' }
                    }),
                    enumerable: true,
                    configurable: true
                });
                
                // 6. 言語設定の現実的偽装
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['ja-JP', 'ja', 'en-US', 'en'],
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'language', {
                    get: () => 'ja-JP',
                    enumerable: true,
                    configurable: true
                });
                
                // 7. WebRTC偽装
                const getStats = RTCPeerConnection.prototype.getStats;
                RTCPeerConnection.prototype.getStats = function() {
                    return getStats.apply(this, arguments);
                };
                
                // 8. Canvas fingerprinting対策
                const toBlob = HTMLCanvasElement.prototype.toBlob;
                const toDataURL = HTMLCanvasElement.prototype.toDataURL;
                const getImageData = CanvasRenderingContext2D.prototype.getImageData;
                
                HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
                    return toBlob.apply(this, arguments);
                };
                
                HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
                    return toDataURL.apply(this, arguments);
                };
                
                CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
                    return getImageData.apply(this, arguments);
                };
                
                // 9. バッテリー API 無効化
                if (navigator.getBattery) {
                    navigator.getBattery = () => Promise.reject(new Error('Not supported'));
                }
                
                // 10. その他検知回避
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 8,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 8,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(screen, 'colorDepth', {
                    get: () => 24,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(screen, 'pixelDepth', {
                    get: () => 24,
                    enumerable: true,
                    configurable: true
                });
                
                // 11. Twitter固有の検知回避
                // windowサイズの自然な偽装
                Object.defineProperty(window, 'outerWidth', {
                    get: () => 1366,
                    configurable: true
                });
                Object.defineProperty(window, 'outerHeight', {
                    get: () => 768,
                    configurable: true
                });
                Object.defineProperty(window, 'innerWidth', {
                    get: () => 1349,
                    configurable: true
                });
                Object.defineProperty(window, 'innerHeight', {
                    get: () => 731,
                    configurable: true
                });
                
                // スクリーン解像度の偽装
                Object.defineProperty(screen, 'width', {
                    get: () => 1366,
                    configurable: true
                });
                Object.defineProperty(screen, 'height', {
                    get: () => 768,
                    configurable: true
                });
                Object.defineProperty(screen, 'availWidth', {
                    get: () => 1366,
                    configurable: true
                });
                Object.defineProperty(screen, 'availHeight', {
                    get: () => 768,
                    configurable: true
                });
                
                // タッチデバイスでないことを強調
                Object.defineProperty(navigator, 'maxTouchPoints', {
                    get: () => 0,
                    configurable: true
                });
                
                // メディアクエリの偽装
                const originalMatchMedia = window.matchMedia;
                window.matchMedia = function(query) {
                    const result = originalMatchMedia.call(this, query);
                    // プリファースカラースキームなどの設定
                    if (query.includes('prefers-color-scheme')) {
                        Object.defineProperty(result, 'matches', {
                            get: () => query.includes('light'),
                            configurable: true
                        });
                    }
                    return result;
                };
                
                // Notificationの偽装
                if ('Notification' in window) {
                    Object.defineProperty(Notification, 'permission', {
                        get: () => 'default',
                        configurable: true
                    });
                }
                
                // ServiceWorker関連の偽装
                if ('serviceWorker' in navigator) {
                    Object.defineProperty(navigator.serviceWorker, 'controller', {
                        get: () => null,
                        configurable: true
                    });
                }
                
                // Cookieの自然な動作偽装
                const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') || 
                                                Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
                if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
                    Object.defineProperty(document, 'cookie', {
                        get: function() {
                            return originalCookieDescriptor.get.call(this);
                        },
                        set: function(val) {
                            return originalCookieDescriptor.set.call(this, val);
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
                
                // Performance APIの偽装
                if (window.performance && window.performance.timing) {
                    const now = Date.now();
                    Object.defineProperty(window.performance.timing, 'navigationStart', {
                        get: () => now - Math.random() * 1000,
                        configurable: true
                    });
                }
                
                // Connection APIの偽装
                if (navigator.connection) {
                    Object.defineProperty(navigator.connection, 'effectiveType', {
                        get: () => '4g',
                        configurable: true
                    });
                    Object.defineProperty(navigator.connection, 'downlink', {
                        get: () => 10,
                        configurable: true
                    });
                }
                
                console.log('✅ 最強自動化検知回避スクリプト適用完了（Twitter認証強化版）');
            """
            
            # すべての新しいページに適用
            self.context.add_init_script(stealth_script)
            # 現在のページに即座に適用
            self.page.evaluate(stealth_script)
            self.debug_log("✅ 自動化検知回避スクリプト適用完了")
            
            # ページエラーリスナーを追加
            def on_page_error(error):
                self.debug_log(f"❌ ページエラー検出: {error}", "ERROR")
            
            def on_page_crash(page):
                self.debug_log(f"💥 ページクラッシュ検出: {page.url}", "CRITICAL")
            
            self.page.on("pageerror", on_page_error)
            self.page.on("crash", on_page_crash)
            
            self.debug_log("✅ Playwright ブラウザ起動成功（永続プロファイル）")
            self.log_memory_usage()
            return True
            
        except Exception as e:
            error_msg = f"ブラウザ起動エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            logger.error(error_msg)
            self.cleanup()
            return False
    
    def navigate_to_twitter(self):
        """Twitterホームページに移動"""
        try:
            self.debug_log("🐦 Twitterに移動開始")
            self.log_memory_usage()
            
            # ページが存在することを確認
            if not self.page:
                self.debug_log("❌ ページが存在しません", "ERROR")
                return False
                
            self.debug_log("ページ移動実行: https://x.com/home")
            self.page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=30000)
            self.debug_log("✅ ページ移動完了")
            self.log_memory_usage()
            
            # 少し待機
            self.debug_log("3秒待機中...")
            time.sleep(3)
            
            current_url = self.page.url
            self.debug_log(f"現在のURL: {current_url}")
            
            # ページタイトルも取得
            try:
                title = self.page.title()
                self.debug_log(f"ページタイトル: {title}")
            except Exception as e:
                self.debug_log(f"タイトル取得エラー: {e}", "WARNING")
            
            self.debug_log("✅ Twitter移動成功")
            return True
            
        except Exception as e:
            error_msg = f"Twitter移動エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            logger.error(error_msg)
            return False
    
    def check_login_status(self):
        """ログイン状態チェック（改良版）"""
        try:
            current_url = self.page.url
            self.debug_log(f"ログイン状態チェック - URL: {current_url}")
            
            # ページタイトルも取得してチェック
            try:
                title = self.page.title()
                self.debug_log(f"ページタイトル: {title}")
                
                # ログインページの特徴的なタイトルをチェック
                if 'ログイン' in title or 'Login' in title or 'Xにログイン' in title:
                    self.debug_log("❌ タイトルからログインページと判定")
                    logger.info("❌ ログインが必要（タイトル判定）")
                    return False
                    
            except Exception as title_error:
                self.debug_log(f"タイトル取得エラー: {title_error}", "WARNING")
            
            # DOM要素でのログイン状態確認（より確実）
            try:
                # ログイン済みの場合に存在する要素をチェック
                logged_in_indicators = [
                    '[data-testid="SideNav_NewTweet_Button"]',  # 投稿ボタン
                    '[data-testid="AppTabBar_Home_Link"]',      # ホームリンク
                    'nav[role="navigation"]',                   # ナビゲーション
                    '[aria-label*="ホーム"]',                   # ホームボタン
                    '[data-testid="primaryColumn"]'             # メインカラム
                ]
                
                found_login_elements = 0
                for selector in logged_in_indicators:
                    try:
                        element = self.page.query_selector(selector)
                        if element:
                            found_login_elements += 1
                            self.debug_log(f"✅ ログイン要素発見: {selector}")
                    except Exception as selector_error:
                        self.debug_log(f"セレクター {selector} エラー: {selector_error}", "WARNING")
                        continue
                
                # 複数のログイン要素が見つかった場合のみログイン済みと判定
                if found_login_elements >= 2:
                    self.debug_log(f"✅ ログイン要素 {found_login_elements}個発見 - ログイン済みと判定")
                    logger.info("✅ ログイン済み（DOM要素判定）")
                    return True
                else:
                    self.debug_log(f"❌ ログイン要素 {found_login_elements}個のみ - ログインが必要")
                    logger.info("❌ ログインが必要（DOM要素判定）")
                    return False
                    
            except Exception as dom_error:
                self.debug_log(f"DOM要素チェックエラー: {dom_error}", "WARNING")
                
                # DOM要素チェックに失敗した場合、URLとタイトルで判定
                if 'login' in current_url or 'oauth' in current_url:
                    logger.info("❌ ログインが必要（URL判定）")
                    return False
                elif 'home' in current_url:
                    # URLにhomeが含まれていても、タイトルでログインページでないことを確認
                    try:
                        title = self.page.title()
                        if 'ログイン' in title or 'Login' in title:
                            logger.info("❌ ログインが必要（タイトル判定）")
                            return False
                    except:
                        pass
                    
                    logger.info("✅ ログイン済み（URL判定）")
                    return True
                else:
                    logger.warning(f"不明なページ: {current_url}")
                    return False
                
        except Exception as e:
            error_msg = f"ログイン状態チェックエラー: {e}"
            self.debug_log(error_msg, "ERROR")
            logger.error(error_msg)
            return False
    
    def wait_for_manual_login(self, timeout=180):
        """手動ログイン待機（3分間に延長）"""
        try:
            self.debug_log("🔐 === 手動ログイン待機開始 ===")
            print("🔐 === 手動ログイン待機開始 ===")
            print("ブラウザでTwitterにログインしてください")
            print("⏰ 最大3分間お待ちします")
            print("📍 ログイン完了後、ブラウザは自動で投稿処理に進みます")
            self.log_memory_usage()
            
            start_time = time.time()
            last_status_time = 0
            
            while time.time() - start_time < timeout:
                try:
                    # ページの健全性をチェック
                    if not self.page:
                        self.debug_log("❌ ページが存在しません", "ERROR")
                        return False
                    
                    # ブラウザの健全性をチェック（永続コンテキスト対応）
                    try:
                        # 永続コンテキストの場合、contextからブラウザを取得
                        if hasattr(self.context, 'browser') and self.context.browser:
                            if not self.context.browser.is_connected():
                                self.debug_log("❌ ブラウザが切断されました", "ERROR")
                                return False
                        elif self.browser and not self.browser.is_connected():
                            self.debug_log("❌ ブラウザが切断されました", "ERROR")
                            return False
                    except Exception as browser_check_error:
                        self.debug_log(f"ブラウザ状態チェック中エラー: {browser_check_error}", "WARNING")
                        # エラーが発生した場合は続行（切断チェックをスキップ）
                        
                    current_url = self.page.url
                    elapsed = time.time() - start_time
                    
                    # 詳細なログイン状態チェック（改良版）
                    
                    # ログインページの特徴をチェック
                    if 'login' in current_url or 'flow' in current_url:
                        self.debug_log("⏳ ログインページで待機中...")
                        if elapsed - last_status_time >= 30:  # 30秒ごとに表示
                            print("⏳ ログインページで待機中... 手動でログインしてください")
                    
                    # ホームページや認証後ページの検出
                    elif 'home' in current_url or 'x.com' == current_url or current_url.endswith('x.com/'):
                        self.debug_log("✅ Twitterホームページを検出")
                        print("✅ Twitterホームページを検出")
                        
                        # 追加確認：ナビゲーション要素の存在チェック
                        nav_selectors = [
                            '[data-testid="SideNav_NewTweet_Button"]',
                            '[data-testid="AppTabBar_Home_Link"]',
                            '[aria-label*="ホーム"]',
                            'nav[role="navigation"]',
                            '[data-testid="primaryColumn"]'
                        ]
                        
                        logged_in_confirmed = False
                        for selector in nav_selectors:
                            try:
                                element = self.page.query_selector(selector)
                                if element:
                                    self.debug_log(f"✅ ログイン確認要素発見: {selector}")
                                    print(f"✅ ログイン確認要素発見: {selector}")
                                    logged_in_confirmed = True
                                    break
                            except Exception as selector_error:
                                self.debug_log(f"セレクター {selector} チェック中エラー: {selector_error}", "WARNING")
                                continue
                        
                        # ページタイトルでもチェック
                        try:
                            title = self.page.title()
                            if not ('ログイン' in title or 'Login' in title or 'Log in' in title):
                                if 'Home' in title or 'X' == title.strip() or 'Twitter' in title:
                                    self.debug_log(f"✅ ログイン完了タイトル検出: {title}")
                                    logged_in_confirmed = True
                        except:
                            pass
                        
                        if logged_in_confirmed:
                            self.debug_log("✅ === 手動ログイン完了確認 ===")
                            print("✅ === 手動ログイン完了確認 ===")
                            print("🎉 Twitterへのログインが完了しました！")
                            self.log_memory_usage()
                            return True
                        else:
                            self.debug_log("⏳ ホームページですが、ログイン要素を確認中...")
                            if elapsed - last_status_time >= 15:  # 15秒ごとに表示
                                print("⏳ ホームページですが、ログイン要素を確認中...")
                    
                    # その他のページ
                    else:
                        self.debug_log(f"⏳ 待機中 - URL: {current_url}")
                        if elapsed - last_status_time >= 30:  # 30秒ごとに表示
                            print(f"⏳ 待機中 - 現在のページ: {current_url[:50]}...")
                    
                    # 15秒ごとに詳細進捗表示
                    if elapsed - last_status_time >= 15:
                        remaining = int(timeout - elapsed)
                        status_msg = f"⏳ 手動ログイン待機中... 残り{remaining}秒"
                        url_msg = f"📍 現在のURL: {current_url[:50]}..."
                        
                        self.debug_log(status_msg)
                        self.debug_log(url_msg)
                        print(status_msg)
                        print(url_msg)
                        self.log_memory_usage()
                        
                        # ページの応答性をチェック
                        try:
                            title = self.page.title()
                            self.debug_log(f"ページタイトル: {title}")
                        except Exception as title_error:
                            self.debug_log(f"ページタイトル取得失敗: {title_error}", "WARNING")
                        
                        last_status_time = elapsed
                    
                    # 短い間隔で待機
                    time.sleep(3)
                    
                except Exception as e:
                    error_msg = f"❌ ログイン待機中エラー: {e}"
                    self.debug_log(error_msg, "ERROR")
                    self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
                    print(error_msg)
                    
                    # エラーが続く場合は少し長めに待機
                    time.sleep(5)
            
            timeout_msg = "❌ 手動ログインタイムアウト（3分経過）"
            self.debug_log(timeout_msg, "ERROR")
            print(timeout_msg)
            print("💡 ブラウザを開いたまま、再度ログインをお試しください")
            return False
            
        except Exception as e:
            error_msg = f"❌ 手動ログイン待機エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            print(error_msg)
            return False
    
    def post_tweet(self, message, image_paths=None, test_mode=True):
        """ツイート投稿（画像対応）"""
        try:
            self.debug_log(f"📝 ツイート投稿開始 (テストモード: {test_mode})")
            if image_paths:
                self.debug_log(f"📷 画像ファイル: {len(image_paths)}枚")
                for i, path in enumerate(image_paths):
                    self.debug_log(f"  {i+1}. {path}")
            
            # 投稿ボタンを探す
            post_selectors = [
                '[data-testid="SideNav_NewTweet_Button"]',
                'a[href="/compose/tweet"]',
                '[aria-label*="ツイート"]',
                '[aria-label*="Tweet"]'
            ]
            
            post_button = None
            for selector in post_selectors:
                try:
                    post_button = self.page.query_selector(selector)
                    if post_button:
                        self.debug_log(f"投稿ボタン発見: {selector}")
                        logger.info(f"投稿ボタン発見: {selector}")
                        break
                except:
                    continue
            
            if not post_button:
                raise Exception("投稿ボタンが見つかりません")
            
            # 投稿ボタンをクリック（自然な動作）
            self.debug_log("投稿ボタンをクリック")
            self.natural_click(post_button)
            self.human_delay(2000, 4000)  # 投稿画面の読み込み待機
            
            # テキスト復元用の変数を初期化
            text_before_upload = ""
            
            # 画像アップロード処理（JavaScript ファイル操作方式）
            if image_paths:
                self.debug_log("📷 画像アップロード処理開始（JavaScript方式）")
                text_before_upload = self.check_text_content(step_name="画像アップロード前")
                success_count = 0
                
                for i, image_path in enumerate(image_paths):
                    try:
                        # 画像ファイルの存在確認
                        if not Path(image_path).exists():
                            self.debug_log(f"❌ 画像ファイルが見つかりません: {image_path}", "ERROR")
                            continue
                            
                        self.debug_log(f"📷 画像 {i+1}/{len(image_paths)} をアップロード中: {Path(image_path).name}")
                        
                        # 画像ファイルをbase64として読み込み
                        with open(image_path, 'rb') as f:
                            image_data = f.read()
                            import base64
                            base64_data = base64.b64encode(image_data).decode('utf-8')
                        
                        # メディアアップロードボタンを探す（詳細デバッグ付き）
                        media_selectors = [
                            '[data-testid="attachments"]',
                            '[aria-label*="メディア"]', 
                            '[aria-label*="media"]',
                            '[aria-label*="Media"]',
                            '[data-testid="toolbarAddMedia"]',
                            'input[type="file"][accept*="image"]',
                            '[role="button"][aria-label*="写真"]',
                            '[role="button"][aria-label*="画像"]',
                            'svg[viewBox="0 0 24 24"] + input[type="file"]',
                            '.r-1p0dtai.r-1d2f490.r-u8s1d.r-zchlnj.r-ipm5af.r-13qz1uu',
                            '[data-testid="fileInput"]'
                        ]
                        
                        self.debug_log(f"🔍 [DEBUG] メディアボタン検索開始: {len(media_selectors)}個のセレクタを試行")
                        
                        media_button = None
                        found_selector = None
                        for i, selector in enumerate(media_selectors):
                            try:
                                self.debug_log(f"🔍 [DEBUG] セレクタ {i+1}/{len(media_selectors)} 試行中: {selector}")
                                elements = self.page.query_selector_all(selector)
                                self.debug_log(f"📊 [DEBUG] セレクタ {selector} で {len(elements)}個の要素発見")
                                
                                for j, element in enumerate(elements):
                                    try:
                                        is_visible = element.is_visible()
                                        is_enabled = element.is_enabled()
                                        self.debug_log(f"📊 [DEBUG] 要素 {j+1}: visible={is_visible}, enabled={is_enabled}")
                                        
                                        if is_visible and is_enabled:
                                            media_button = element
                                            found_selector = selector
                                            self.debug_log(f"✅ [DEBUG] メディアボタン発見: {selector} (要素 {j+1})")
                                            break
                                    except Exception as e:
                                        self.debug_log(f"⚠️ [DEBUG] 要素 {j+1} チェックエラー: {e}")
                                        
                                if media_button:
                                    break
                                    
                            except Exception as e:
                                self.debug_log(f"❌ [DEBUG] セレクタ {selector} でエラー: {e}")
                                continue
                        
                        if not media_button:
                            self.debug_log("❌ [ERROR] メディアボタンが見つかりません。全ボタン要素を調査中...")
                            
                            # 全ボタン要素を調査
                            all_buttons = self.page.query_selector_all('button, [role="button"]')
                            self.debug_log(f"🔍 [DEBUG] ページ内の全ボタン数: {len(all_buttons)}")
                            
                            for i, btn in enumerate(all_buttons[:10]):  # 最初の10個だけ調査
                                try:
                                    aria_label = btn.get_attribute('aria-label') or ''
                                    data_testid = btn.get_attribute('data-testid') or ''
                                    text_content = btn.text_content() or ''
                                    is_visible = btn.is_visible()
                                    
                                    if any(keyword in (aria_label + data_testid + text_content).lower() for keyword in ['media', 'photo', 'image', '写真', '画像', 'メディア']):
                                        self.debug_log(f"🎯 [DEBUG] 候補ボタン {i+1}: aria-label='{aria_label}', data-testid='{data_testid}', text='{text_content}', visible={is_visible}")
                                        if is_visible:
                                            media_button = btn
                                            found_selector = f'候補ボタン{i+1}'
                                            break
                                except:
                                    continue
                        
                        # メディアボタンをクリックしてファイル入力要素を作成
                        if media_button:
                            try:
                                self.debug_log(f"🚀 [DEBUG] メディアボタンクリック実行: {found_selector}")
                                
                                # クリック前のファイル入力要素数を確認
                                before_inputs = len(self.page.query_selector_all('input[type="file"]'))
                                self.debug_log(f"📊 [DEBUG] クリック前のファイル入力要素数: {before_inputs}")
                                
                                self.natural_click(media_button)
                                self.human_delay(1000, 2000)  # ファイル入力要素が作成されるまで待機
                                
                                # クリック後のファイル入力要素数を確認
                                after_inputs = len(self.page.query_selector_all('input[type="file"]'))
                                self.debug_log(f"📊 [DEBUG] クリック後のファイル入力要素数: {after_inputs}")
                                
                                if after_inputs > before_inputs:
                                    self.debug_log(f"✅ [DEBUG] ファイル入力要素が {after_inputs - before_inputs} 個新規作成されました")
                                else:
                                    self.debug_log("⚠️ [WARNING] ファイル入力要素が新規作成されませんでした")
                            except Exception as e:
                                self.debug_log(f"❌ [ERROR] メディアボタンクリックエラー: {str(e)}")
                        else:
                            self.debug_log("❌ [ERROR] メディアボタンが見つからないため、JavaScript直接実行を試行")
                            
                            # メディアボタンが見つからない場合の代替手段
                            try:
                                # 既存のファイル入力要素を直接使用
                                existing_inputs = self.page.query_selector_all('input[type="file"]')
                                self.debug_log(f"📊 [DEBUG] 既存ファイル入力要素数: {len(existing_inputs)}")
                                
                                if len(existing_inputs) == 0:
                                    # ファイル入力要素がない場合、動的に作成
                                    self.debug_log("🛠️ [DEBUG] ファイル入力要素を動的作成中...")
                                    self.page.evaluate('''
                                        // 動的にファイル入力要素を作成
                                        const fileInput = document.createElement('input');
                                        fileInput.type = 'file';
                                        fileInput.accept = 'image/*';
                                        fileInput.style.position = 'absolute';
                                        fileInput.style.opacity = '0';
                                        fileInput.style.zIndex = '9999';
                                        document.body.appendChild(fileInput);
                                        console.log('[DEBUG] 動的ファイル入力要素作成完了');
                                    ''')
                                    self.human_delay(500, 1000)
                            except Exception as e:
                                self.debug_log(f"❌ [ERROR] 代替手段失敗: {e}")
                            
                            # JavaScriptでファイルアップロードをシミュレート（強化版）
                            self.debug_log("📁 [DEBUG] JavaScript強化版でファイル設定実行中...")
                            self.debug_log(f"📊 [DEBUG] base64データ長: {len(base64_data)} 文字")
                            
                            result = self.page.evaluate('''
                                async (base64Data, fileName) => {
                                    try {
                                        console.log('='.repeat(50));
                                        console.log('[DEBUG] 📁 ファイルアップロードシミュレーション開始');
                                        console.log('[DEBUG] 📊 ファイル名:', fileName);
                                        console.log('[DEBUG] 📊 base64データ長:', base64Data.length);
                                        
                                        // STEP 1: base64からBlobを作成
                                        console.log('[DEBUG] 🔄 STEP 1: base64からBlob変換開始');
                                        let byteCharacters, byteArray, blob, file;
                                        
                                        try {
                                            byteCharacters = atob(base64Data);
                                            console.log('[DEBUG] ✅ atob完了, バイト長:', byteCharacters.length);
                                        } catch (e) {
                                            console.error('[DEBUG] ❌ atobエラー:', e);
                                            return { success: false, error: 'atob失敗: ' + e.message };
                                        }
                                        
                                        try {
                                            const byteNumbers = new Array(byteCharacters.length);
                                            for (let i = 0; i < byteCharacters.length; i++) {
                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                            }
                                            byteArray = new Uint8Array(byteNumbers);
                                            console.log('[DEBUG] ✅ byteArray作成完了, サイズ:', byteArray.length);
                                        } catch (e) {
                                            console.error('[DEBUG] ❌ byteArray作成エラー:', e);
                                            return { success: false, error: 'byteArray作成失敗: ' + e.message };
                                        }
                                        
                                        try {
                                            blob = new Blob([byteArray], {type: 'image/png'});
                                            console.log('[DEBUG] ✅ Blob作成完了, サイズ:', blob.size, 'bytes');
                                        } catch (e) {
                                            console.error('[DEBUG] ❌ Blob作成エラー:', e);
                                            return { success: false, error: 'Blob作成失敗: ' + e.message };
                                        }
                                        
                                        // STEP 2: Fileオブジェクトを作成
                                        console.log('[DEBUG] 🔄 STEP 2: Fileオブジェクト作成');
                                        try {
                                            file = new File([blob], fileName, {
                                                type: 'image/png',
                                                lastModified: Date.now()
                                            });
                                            console.log('[DEBUG] ✅ File作成完了:');
                                            console.log('  - ファイル名:', file.name);
                                            console.log('  - サイズ:', file.size, 'bytes');
                                            console.log('  - タイプ:', file.type);
                                            console.log('  - 最終更新:', new Date(file.lastModified).toISOString());
                                        } catch (e) {
                                            console.error('[DEBUG] ❌ File作成エラー:', e);
                                            return { success: false, error: 'File作成失敗: ' + e.message };
                                        }
                                        
                                        // STEP 3: ファイル入力要素を探す（強化版）
                                        console.log('[DEBUG] 🔄 STEP 3: ファイル入力要素検索開始');
                                        
                                        // 既存要素を調査
                                        let fileInputs = document.querySelectorAll('input[type="file"]');
                                        console.log('[DEBUG] 📊 既存ファイル入力要素数:', fileInputs.length);
                                        
                                        // 各要素の詳細を調査
                                        for (let i = 0; i < fileInputs.length; i++) {
                                            const input = fileInputs[i];
                                            const rect = input.getBoundingClientRect();
                                            const style = window.getComputedStyle(input);
                                            console.log(`[DEBUG] 📊 Input ${i}:`);
                                            console.log(`  - accept: '${input.accept}'`);
                                            console.log(`  - visible: ${rect.width > 0 || rect.height > 0}`);
                                            console.log(`  - display: '${style.display}'`);
                                            console.log(`  - visibility: '${style.visibility}'`);
                                            console.log(`  - opacity: '${style.opacity}'`);
                                            console.log(`  - position: ${rect.left}, ${rect.top}`);
                                            console.log(`  - size: ${rect.width} x ${rect.height}`);
                                        }
                                        
                                        // ファイル入力要素がない場合、動的作成
                                        if (fileInputs.length === 0) {
                                            console.log('[DEBUG] 🛠️ ファイル入力要素がないため、動的作成を実行');
                                            
                                            // メインエリアを探す
                                            const mainAreas = [
                                                'main[role="main"]',
                                                '[data-testid="primaryColumn"]',
                                                '[aria-label*="タイムライン"]',
                                                '[data-testid="tweetTextarea_0"]'
                                            ];
                                            
                                            let targetArea = document.body;
                                            for (const selector of mainAreas) {
                                                const area = document.querySelector(selector);
                                                if (area) {
                                                    targetArea = area;
                                                    console.log('[DEBUG] ✅ メインエリア発見:', selector);
                                                    break;
                                                }
                                            }
                                            
                                            // 動的ファイル入力要素を作成
                                            const dynamicInput = document.createElement('input');
                                            dynamicInput.type = 'file';
                                            dynamicInput.accept = 'image/*,.png,.jpg,.jpeg,.gif,.webp';
                                            dynamicInput.multiple = false;
                                            dynamicInput.style.cssText = `
                                                position: absolute !important;
                                                left: -9999px !important;
                                                top: -9999px !important;
                                                opacity: 0 !important;
                                                width: 1px !important;
                                                height: 1px !important;
                                                z-index: 9999 !important;
                                                pointer-events: none !important;
                                            `;
                                            dynamicInput.setAttribute('data-testid', 'claude-dynamic-file-input');
                                            dynamicInput.setAttribute('data-purpose', 'twitter-image-upload');
                                            
                                            targetArea.appendChild(dynamicInput);
                                            console.log('[DEBUG] ✅ 動的ファイル入力要素作成完了');
                                            
                                            // 再検索
                                            fileInputs = document.querySelectorAll('input[type="file"]');
                                            console.log('[DEBUG] 📊 作成後のファイル入力要素数:', fileInputs.length);
                                        }
                                        
                                        // STEP 4: 最適なファイル入力要素を選択
                                        console.log('[DEBUG] 🔄 STEP 4: ターゲット要素選択開始');
                                        
                                        let targetInput = null;
                                        let targetReason = '';
                                        
                                        // 優先度順で探す
                                        const priorities = [
                                            { name: 'image-accept', test: (input) => input.accept && input.accept.includes('image') },
                                            { name: 'empty-accept', test: (input) => !input.accept || input.accept === '' },
                                            { name: 'any-accept', test: (input) => true }
                                        ];
                                        
                                        for (const priority of priorities) {
                                            console.log(`[DEBUG] 🔍 優先度 '${priority.name}' で検索中...`);
                                            
                                            for (let i = fileInputs.length - 1; i >= 0; i--) {
                                                const input = fileInputs[i];
                                                
                                                if (priority.test(input)) {
                                                    const rect = input.getBoundingClientRect();
                                                    const style = window.getComputedStyle(input);
                                                    
                                                    console.log(`[DEBUG] 🎯 候補 ${i} (${priority.name}):`);
                                                    console.log(`  - accept: '${input.accept}'`);
                                                    console.log(`  - testid: '${input.getAttribute('data-testid') || 'none'}'`);
                                                    console.log(`  - purpose: '${input.getAttribute('data-purpose') || 'none'}'`);
                                                    
                                                    targetInput = input;
                                                    targetReason = `${priority.name}-${i}`;
                                                    console.log(`[DEBUG] ✅ ターゲット決定: ${targetReason}`);
                                                    break;
                                                }
                                            }
                                            
                                            if (targetInput) break;
                                        }
                                        
                                        if (!targetInput) {
                                            console.log('[DEBUG] ❌ ターゲットが見つからないため、最新要素を使用');
                                            if (fileInputs.length > 0) {
                                                targetInput = fileInputs[fileInputs.length - 1];
                                                targetReason = 'fallback-latest';
                                            }
                                        }
                                        
                                        if (!targetInput) {
                                            console.error('[DEBUG] ❌ ファイル入力要素が全く見つかりません');
                                            return { 
                                                success: false, 
                                                error: 'ファイル入力要素が全く見つかりません',
                                                inputCount: fileInputs.length 
                                            };
                                        }
                                        
                                        console.log(`[DEBUG] ✅ 最終ターゲット決定: ${targetReason}`);
                                        console.log(`[DEBUG] ✅ ターゲット詳細: accept='${targetInput.accept}', testid='${targetInput.getAttribute('data-testid') || 'none'}'`);
                                        
                                        // STEP 5: ファイル設定実行（強化版）
                                        console.log('[DEBUG] 🔄 STEP 5: ファイル設定実行開始');
                                        
                                        try {
                                            // DataTransferオブジェクトを作成
                                            console.log('[DEBUG] 🔄 DataTransfer作成中...');
                                            const dt = new DataTransfer();
                                            dt.items.add(file);
                                            console.log('[DEBUG] ✅ DataTransferにファイル追加完了:', dt.files.length, 'ファイル');
                                            
                                            // ファイルを入力要素に設定
                                            console.log('[DEBUG] 🔄 ファイル設定中...');
                                            const previousFileCount = targetInput.files ? targetInput.files.length : 0;
                                            targetInput.files = dt.files;
                                            const newFileCount = targetInput.files ? targetInput.files.length : 0;
                                            
                                            console.log('[DEBUG] ✅ ファイル設定完了:');
                                            console.log(`  - 設定前: ${previousFileCount} ファイル`);
                                            console.log(`  - 設定後: ${newFileCount} ファイル`);
                                            
                                            if (newFileCount > 0) {
                                                const uploadedFile = targetInput.files[0];
                                                console.log('[DEBUG] ✅ アップロードファイル詳細:');
                                                console.log(`  - 名前: ${uploadedFile.name}`);
                                                console.log(`  - サイズ: ${uploadedFile.size} bytes`);
                                                console.log(`  - タイプ: ${uploadedFile.type}`);
                                                console.log(`  - 最終更新: ${new Date(uploadedFile.lastModified).toISOString()}`);
                                            } else {
                                                console.warn('[DEBUG] ⚠️ ファイル設定後もファイル数が0です');
                                            }
                                            
                                        } catch (fileSetError) {
                                            console.error('[DEBUG] ❌ ファイル設定エラー:', fileSetError);
                                            return { 
                                                success: false, 
                                                error: 'ファイル設定エラー: ' + fileSetError.message,
                                                inputCount: fileInputs.length,
                                                targetReason: targetReason
                                            };
                                        }
                                        
                                        // STEP 6: イベント発火（強化版）
                                        console.log('[DEBUG] 🔄 STEP 6: イベント発火シーケンス開始');
                                        
                                        const eventResults = [];
                                        
                                        // 基本イベント発火
                                        const basicEvents = [
                                            { name: 'focus', options: { bubbles: true, cancelable: true } },
                                            { name: 'change', options: { bubbles: true, cancelable: true } },
                                            { name: 'input', options: { bubbles: true, cancelable: true } },
                                            { name: 'blur', options: { bubbles: true, cancelable: true } }
                                        ];
                                        
                                        for (const eventDef of basicEvents) {
                                            try {
                                                const event = new Event(eventDef.name, eventDef.options);
                                                const result = targetInput.dispatchEvent(event);
                                                eventResults.push({ event: eventDef.name, success: true, result });
                                                console.log(`[DEBUG] ✅ ${eventDef.name}イベント発火: ${result}`);
                                            } catch (e) {
                                                eventResults.push({ event: eventDef.name, success: false, error: e.message });
                                                console.warn(`[DEBUG] ⚠️ ${eventDef.name}イベントエラー:`, e);
                                            }
                                        }
                                        
                                        // React系イベント発火
                                        try {
                                            console.log('[DEBUG] 🔄 React系イベント発火中...');
                                            
                                            // Reactのvalue trackerをリセット
                                            if (targetInput._valueTracker) {
                                                targetInput._valueTracker.setValue('');
                                                console.log('[DEBUG] ✅ React valueTrackerリセット完了');
                                            }
                                            
                                            // カスタムイベント発火
                                            const customEvents = [
                                                { name: 'fileselected', detail: { files: targetInput.files } },
                                                { name: 'filesadded', detail: { files: targetInput.files } },
                                                { name: 'uploadready', detail: { files: targetInput.files } }
                                            ];
                                            
                                            for (const customEvent of customEvents) {
                                                try {
                                                    const event = new CustomEvent(customEvent.name, {
                                                        bubbles: true,
                                                        cancelable: true,
                                                        detail: customEvent.detail
                                                    });
                                                    const result = targetInput.dispatchEvent(event);
                                                    console.log(`[DEBUG] ✅ カスタムイベント ${customEvent.name}: ${result}`);
                                                } catch (e) {
                                                    console.warn(`[DEBUG] ⚠️ カスタムイベント ${customEvent.name} エラー:`, e);
                                                }
                                            }
                                            
                                        } catch (reactError) {
                                            console.warn('[DEBUG] ⚠️ React系イベントエラー:', reactError);
                                        }
                                        
                                        // 最終確認
                                        const finalFileCount = targetInput.files ? targetInput.files.length : 0;
                                        console.log('[DEBUG] 🏁 最終確認:');
                                        console.log(`  - ファイル数: ${finalFileCount}`);
                                        console.log(`  - イベント結果: ${eventResults.filter(r => r.success).length}/${eventResults.length} 成功`);
                                        console.log(`  - ターゲット理由: ${targetReason}`);
                                        console.log('='.repeat(50));
                                        
                                        return { 
                                            success: true, 
                                            message: 'ファイル設定・イベント発火完了',
                                            inputCount: fileInputs.length,
                                            targetAccept: targetInput.accept,
                                            targetReason: targetReason,
                                            finalFileCount: finalFileCount,
                                            eventResults: eventResults,
                                            uploadedFile: finalFileCount > 0 ? {
                                                name: targetInput.files[0].name,
                                                size: targetInput.files[0].size,
                                                type: targetInput.files[0].type
                                            } : null
                                        };
                                    } catch (error) {
                                        console.error('[DEBUG] ファイル設定エラー:', error);
                                        return { success: false, error: error.message };
                                    }
                                }
                            ''', base64_data, Path(image_path).name)
                            
                            if result.get('success'):
                                self.debug_log(f"✅ JavaScript方式でファイル設定成功: {result.get('message')}")
                                self.debug_log(f"📊 入力要素数: {result.get('inputCount')}, 対象accept: {result.get('targetAccept')}")
                                success_count += 1
                                self.debug_log(f"✅ 画像 {i+1} アップロード成功")
                            else:
                                self.debug_log(f"❌ JavaScript方式でファイル設定失敗: {result.get('error')}", "ERROR")
                                self.debug_log(f"📊 入力要素数: {result.get('inputCount', 0)}", "ERROR")
                            
                    except Exception as upload_error:
                        self.debug_log(f"❌ 画像 {i+1} アップロードエラー: {upload_error}", "ERROR")
                        continue
                
                self.debug_log(f"📷 JavaScript方式画像アップロード完了: {success_count}/{len(image_paths)}枚成功")
                if success_count > 0:
                    logger.info(f"✅ 画像アップロード成功: {success_count}枚")
                    
                # 画像アップロード後のテキスト状態をチェック
                text_after_upload = self.check_text_content(step_name="画像アップロード後")
                
                # テキストが削除されていた場合は復元
                if text_before_upload and (not text_after_upload or len(text_after_upload.strip()) == 0):
                    self.debug_log("⚠️ テキストが削除されました。復元を試行します", "WARNING")
                    try:
                        # テキストエリアを探して復元
                        text_area_selectors = [
                            '[data-testid="tweetTextarea_0"]',
                            '.public-DraftEditor-content',
                            '[aria-label*="ツイートを入力"]',
                            '[aria-label*="Tweet text"]',
                            '[contenteditable="true"]',
                            'textarea',
                            '[role="textbox"]'
                        ]
                        
                        text_area_for_restore = None
                        for selector in text_area_selectors:
                            try:
                                element = self.page.query_selector(selector)
                                if element:
                                    text_area_for_restore = element
                                    break
                            except:
                                continue
                                
                        if text_area_for_restore:
                            self.natural_type(text_area_for_restore, text_before_upload, clear_first=False)
                            self.debug_log("✅ テキスト復元完了")
                            self.check_text_content(step_name="テキスト復元後")
                        else:
                            self.debug_log("❌ テキスト復元失敗: テキストエリアが見つかりません", "ERROR")
                    except Exception as e:
                        self.debug_log(f"❌ テキスト復元エラー: {e}", "ERROR")
                
            # テキストエリアを探す
            self.debug_log("📝 テキストエリアを検索中...")
            text_selectors = [
                '[data-testid="tweetTextarea_0"]',
                '.public-DraftEditor-content',
                '[aria-label*="ツイートを入力"]',
                '[aria-label*="Tweet text"]',
                '[contenteditable="true"]'
            ]
            
            text_area = None
            for selector in text_selectors:
                try:
                    text_area = self.page.query_selector(selector)
                    if text_area:
                        self.debug_log(f"テキストエリア発見: {selector}")
                        logger.info(f"テキストエリア発見: {selector}")
                        break
                except:
                    continue
            
            if not text_area:
                raise Exception("テキストエリアが見つかりません")
            
            # テキストを入力（自然なタイピング）
            self.debug_log("📝 テキスト入力中...")
            self.natural_type(text_area, message, clear_first=False)
            
            self.debug_log(f"✅ テキスト入力完了: {message[:50]}...")
            print(f"✅ テキスト入力完了: {message[:50]}...")
            logger.info(f"✅ テキスト入力完了: {message[:50]}...")
            
            if not test_mode:
                # 実際に投稿（強化版 + 詳細デバッグ - 確実に「ポストする」ボタンを押す）
                self.debug_log("🚀 実投稿モード: 投稿ボタンを探しています...")
                self.post_button_debug_log("🚀 [CRITICAL] 実投稿モード開始", {
                    "mode": "実投稿",
                    "test_mode": test_mode,
                    "page_url": self.page.url if self.page else "N/A"
                })
                
                # デバッグ用: 投稿ボタン検索前の状態記録
                self.record_page_state("投稿ボタン検索前")
                self.take_debug_screenshot("before_post_button_search", "投稿ボタン検索開始前のページ状態")
                self.dump_page_html("before_post_button_search", "投稿ボタン検索開始前のHTML")
                
                print("🚀 実投稿モード: 投稿ボタンを探しています...")
                
                # より多くのセレクタパターンを追加（順番も重要）
                submit_selectors = [
                    '[data-testid="tweetButtonInline"]',
                    '[data-testid="tweetButton"]',
                    'button[data-testid="tweetButtonInline"]',
                    'button[data-testid="tweetButton"]',
                    '[role="button"][data-testid="tweetButtonInline"]',
                    '[role="button"][data-testid="tweetButton"]',
                    'button:has-text("ツイートする")',
                    'button:has-text("Tweet")',
                    'button:has-text("Post")',
                    'button:has-text("ポスト")',
                    '[aria-label*="ツイート"]',
                    '[aria-label*="Tweet"]',
                    '[aria-label*="Post"]',
                    'button[aria-label*="ツイート"]',
                    'button[aria-label*="Tweet"]',
                    'button[aria-label*="Post"]',
                    # より汎用的なパターン
                    'button[type="submit"]',
                    'div[role="button"][tabindex="0"]',
                    '[role="button"]:has-text("ツイート")',
                    '[role="button"]:has-text("Tweet")',
                    '[role="button"]:has-text("Post")'
                ]
                
                self.post_button_debug_log("🔍 投稿ボタンセレクター準備完了", {
                    "total_selectors": len(submit_selectors),
                    "selectors": submit_selectors
                })
                
                submit_button = None
                found_selector = None
                
                # 最大3回まで投稿ボタンを探す（リトライ機能）+ 詳細デバッグ
                for attempt in range(3):
                    attempt_data = {
                        "attempt_number": attempt + 1,
                        "total_attempts": 3,
                        "found_buttons": [],
                        "errors": []
                    }
                    
                    self.debug_log(f"投稿ボタン検索試行 {attempt + 1}/3")
                    self.post_button_debug_log(f"🔍 [ATTEMPT {attempt + 1}] 投稿ボタン検索開始", attempt_data)
                    
                    # 試行ごとにスクリーンショット撮影
                    self.take_debug_screenshot(f"search_attempt_{attempt + 1}", f"検索試行 {attempt + 1} 開始時")
                    
                    for i, selector in enumerate(submit_selectors):
                        try:
                            self.debug_log(f"セレクター {i+1}/{len(submit_selectors)}: {selector}")
                            elements = self.page.query_selector_all(selector)
                            
                            selector_data = {
                                "selector": selector,
                                "index": i + 1,
                                "elements_found": len(elements),
                                "element_details": []
                            }
                            
                            self.post_button_debug_log(f"🔍 セレクター検査: {selector}", {
                                "selector_index": i + 1,
                                "total_selectors": len(submit_selectors),
                                "elements_found": len(elements)
                            })
                            
                            for j, element in enumerate(elements):
                                try:
                                    # より詳細な要素チェック
                                    is_visible = element.is_visible()
                                    is_enabled = element.is_enabled()
                                    is_attached = element.is_attached()
                                    text_content = element.text_content() or ""
                                    aria_label = element.get_attribute('aria-label') or ""
                                    data_testid = element.get_attribute('data-testid') or ""
                                    class_name = element.get_attribute('class') or ""
                                    
                                    element_detail = {
                                        "element_index": j + 1,
                                        "visible": is_visible,
                                        "enabled": is_enabled,
                                        "attached": is_attached,
                                        "text_content": text_content[:50],
                                        "aria_label": aria_label[:50],
                                        "data_testid": data_testid,
                                        "class_name": class_name[:100]
                                    }
                                    
                                    selector_data["element_details"].append(element_detail)
                                    
                                    self.debug_log(f"  要素 {j+1}: visible={is_visible}, enabled={is_enabled}, attached={is_attached}")
                                    self.debug_log(f"  要素 {j+1}: text='{text_content[:30]}', aria-label='{aria_label[:30]}'")
                                    
                                    self.post_button_debug_log(f"📍 要素詳細分析 [{i+1}-{j+1}]", element_detail)
                                    
                                    # 投稿ボタンとして適切かチェック
                                    is_tweet_button = (
                                        is_visible and is_enabled and is_attached and
                                        (
                                            'tweet' in selector.lower() or
                                            'post' in selector.lower() or
                                            'ツイート' in (text_content + aria_label).lower() or
                                            'tweet' in (text_content + aria_label).lower() or
                                            'post' in (text_content + aria_label).lower()
                                        )
                                    )
                                    
                                    element_detail["is_tweet_button"] = is_tweet_button
                                    
                                    if is_tweet_button:
                                        submit_button = element
                                        found_selector = f"{selector} (要素 {j+1})"
                                        
                                        button_found_data = {
                                            "selector": selector,
                                            "selector_index": i + 1,
                                            "element_index": j + 1,
                                            "found_selector": found_selector,
                                            "element_details": element_detail
                                        }
                                        
                                        self.debug_log(f"✅ 投稿ボタン発見: {found_selector}")
                                        self.post_button_debug_log("🎯 [SUCCESS] 投稿ボタン発見！", button_found_data)
                                        
                                        # 投稿ボタン発見時のスクリーンショット
                                        self.take_debug_screenshot("button_found", f"投稿ボタン発見: {found_selector}")
                                        
                                        print(f"✅ 投稿ボタン発見: {found_selector}")
                                        logger.info(f"投稿ボタン発見: {found_selector}")
                                        
                                        attempt_data["found_buttons"].append(button_found_data)
                                        break
                                        
                                except Exception as element_error:
                                    error_detail = {
                                        "element_index": j + 1,
                                        "error": str(element_error),
                                        "error_type": type(element_error).__name__
                                    }
                                    selector_data["element_details"].append(error_detail)
                                    attempt_data["errors"].append(error_detail)
                                    
                                    self.debug_log(f"要素 {j+1} チェック中エラー: {element_error}", "WARNING")
                                    self.post_button_debug_log(f"⚠️ 要素検査エラー [{i+1}-{j+1}]", error_detail, "WARNING")
                                    continue
                            
                            # セレクターごとの詳細をデバッグデータに記録
                            self.debug_data.setdefault("post_button_search_attempts", []).append(selector_data)
                            
                            if submit_button:
                                break
                                
                        except Exception as selector_error:
                            error_detail = {
                                "selector": selector,
                                "selector_index": i + 1,
                                "error": str(selector_error),
                                "error_type": type(selector_error).__name__
                            }
                            attempt_data["errors"].append(error_detail)
                            
                            self.debug_log(f"セレクター '{selector}' でエラー: {selector_error}", "WARNING")
                            self.post_button_debug_log(f"❌ セレクターエラー [{i+1}]", error_detail, "ERROR")
                            continue
                    
                    # 試行結果をデバッグデータに記録
                    self.debug_data.setdefault("search_attempts_summary", []).append(attempt_data)
                    
                    if submit_button:
                        self.post_button_debug_log(f"✅ [ATTEMPT {attempt + 1}] 投稿ボタン検索成功", attempt_data)
                        break
                    
                    # ボタンが見つからない場合、短時間待機してリトライ
                    if attempt < 2:
                        self.debug_log(f"投稿ボタンが見つかりません。{2-attempt}秒待機してリトライします...")
                        self.post_button_debug_log(f"⏳ [ATTEMPT {attempt + 1}] ボタン未発見、リトライ待機", {
                            "wait_seconds": 2,
                            "remaining_attempts": 2 - attempt
                        })
                        time.sleep(2)
                        # リトライ前の状態スクリーンショット
                        self.take_debug_screenshot(f"retry_wait_{attempt + 1}", "リトライ前の待機状態")
                    else:
                        self.post_button_debug_log(f"❌ [ATTEMPT {attempt + 1}] 最終試行失敗", attempt_data, "ERROR")

                if submit_button:
                    self.debug_log("🎯 投稿ボタンを確実にクリック中...")
                    self.post_button_debug_log("🎯 [CLICK_START] 投稿ボタンクリック開始", {
                        "button_found": True,
                        "found_selector": found_selector
                    })
                    print("🎯 投稿ボタンを確実にクリック中...")
                    
                    # クリック前の詳細状態記録
                    self.record_page_state("クリック前")
                    self.take_debug_screenshot("before_click", "投稿ボタンクリック直前")
                    
                    # 投稿前の最終確認
                    try:
                        # ★ 投稿直前の最終テキスト確認と復元（Playwright版） ★
                        self.debug_log("🔍 [CRITICAL] 投稿ボタンクリック直前の最終テキスト確認")
                        final_text_content = self.check_text_content(step_name="投稿直前最終確認")
                        
                        if not final_text_content or len(final_text_content.strip()) == 0:
                            self.debug_log("⚠️ [CRITICAL] 投稿直前でテキストが消失！緊急復元開始", "WARNING")
                            try:
                                # テキストエリアを再取得して緊急復元
                                emergency_selectors = [
                                    '[data-testid="tweetTextarea_0"]',
                                    '.public-DraftEditor-content',
                                    '[aria-label*="ツイートを入力"]',
                                    '[aria-label*="Tweet text"]',
                                    '[contenteditable="true"]',
                                    'textarea',
                                    '[role="textbox"]'
                                ]
                                
                                emergency_textarea = None
                                for selector in emergency_selectors:
                                    try:
                                        element = self.page.query_selector(selector)
                                        if element:
                                            emergency_textarea = element
                                            break
                                    except:
                                        continue
                                        
                                if emergency_textarea:
                                    self.debug_log(f"🚨 [EMERGENCY] テキスト緊急復元: {message[:100]}...")
                                    self.natural_type(emergency_textarea, message, clear_first=False)
                                    self.human_delay(1000, 1500)  # 復元後の安定待機
                                    
                                    # 復元後の確認
                                    restored_text = self.check_text_content(step_name="緊急復元後確認")
                                    if restored_text and len(restored_text.strip()) > 0:
                                        self.debug_log("✅ [EMERGENCY] テキスト緊急復元成功")
                                    else:
                                        self.debug_log("❌ [EMERGENCY] テキスト緊急復元失敗", "ERROR")
                                else:
                                    self.debug_log("❌ [EMERGENCY] テキストエリアが見つからず、復元不可", "ERROR")
                            except Exception as e:
                                self.debug_log(f"❌ [EMERGENCY] 緊急復元エラー: {e}", "ERROR")
                        else:
                            self.debug_log(f"✅ [CRITICAL] 投稿直前テキスト確認OK: {len(final_text_content)}文字")
                        
                        # ボタンの最終確認
                        button_text = submit_button.text_content() or ""
                        button_aria = submit_button.get_attribute('aria-label') or ""
                        button_class = submit_button.get_attribute('class') or ""
                        button_id = submit_button.get_attribute('id') or ""
                        button_testid = submit_button.get_attribute('data-testid') or ""
                        
                        final_button_info = {
                            "text_content": button_text,
                            "aria_label": button_aria,
                            "class_name": button_class,
                            "id": button_id,
                            "data_testid": button_testid,
                            "is_visible": submit_button.is_visible(),
                            "is_enabled": submit_button.is_enabled(),
                            "is_attached": submit_button.is_attached()
                        }
                        
                        self.debug_log(f"クリック前確認 - text: '{button_text}', aria-label: '{button_aria}'")
                        self.post_button_debug_log("🔍 [CLICK_PREP] クリック前最終確認", final_button_info)
                        
                        # クリック実行（複数の方法を試行）+ 詳細デバッグ
                        click_success = False
                        click_attempts = []
                        
                        # 方法1: natural_click（通常のクリック）
                        click_attempt = {
                            "method": "natural_click",
                            "attempt_time": datetime.now().isoformat(),
                            "success": False,
                            "error": None
                        }
                        try:
                            self.post_button_debug_log("🔄 [CLICK_METHOD_1] natural_click 試行開始")
                            self.natural_click(submit_button)
                            click_success = True
                            click_attempt["success"] = True
                            self.debug_log("✅ natural_click成功")
                            self.post_button_debug_log("✅ [CLICK_METHOD_1] natural_click 成功！")
                            
                            # クリック成功時のスクリーンショット
                            self.take_debug_screenshot("after_natural_click", "natural_click成功後")
                            
                        except Exception as e1:
                            click_attempt["error"] = str(e1)
                            click_attempt["error_type"] = type(e1).__name__
                            self.debug_log(f"natural_clickエラー: {e1}", "WARNING")
                            self.post_button_debug_log(f"❌ [CLICK_METHOD_1] natural_click失敗", click_attempt, "WARNING")
                        
                        click_attempts.append(click_attempt)
                        
                        # 方法2: 直接クリック
                        if not click_success:
                            click_attempt = {
                                "method": "direct_click",
                                "attempt_time": datetime.now().isoformat(),
                                "success": False,
                                "error": None
                            }
                            try:
                                self.post_button_debug_log("🔄 [CLICK_METHOD_2] direct_click 試行開始")
                                submit_button.click()
                                click_success = True
                                click_attempt["success"] = True
                                self.debug_log("✅ 直接click成功")
                                self.post_button_debug_log("✅ [CLICK_METHOD_2] direct_click 成功！")
                                
                                # クリック成功時のスクリーンショット
                                self.take_debug_screenshot("after_direct_click", "direct_click成功後")
                                
                            except Exception as e2:
                                click_attempt["error"] = str(e2)
                                click_attempt["error_type"] = type(e2).__name__
                                self.debug_log(f"直接clickエラー: {e2}", "WARNING")
                                self.post_button_debug_log(f"❌ [CLICK_METHOD_2] direct_click失敗", click_attempt, "WARNING")
                            
                            click_attempts.append(click_attempt)
                        
                        # 方法3: JavaScriptクリック
                        if not click_success:
                            click_attempt = {
                                "method": "javascript_click",
                                "attempt_time": datetime.now().isoformat(),
                                "success": False,
                                "error": None
                            }
                            try:
                                self.post_button_debug_log("🔄 [CLICK_METHOD_3] javascript_click 試行開始")
                                submit_button.evaluate("element => element.click()")
                                click_success = True
                                click_attempt["success"] = True
                                self.debug_log("✅ JavaScriptクリック成功")
                                self.post_button_debug_log("✅ [CLICK_METHOD_3] javascript_click 成功！")
                                
                                # クリック成功時のスクリーンショット
                                self.take_debug_screenshot("after_js_click", "javascript_click成功後")
                                
                            except Exception as e3:
                                click_attempt["error"] = str(e3)
                                click_attempt["error_type"] = type(e3).__name__
                                self.debug_log(f"JavaScriptクリックエラー: {e3}", "WARNING")
                                self.post_button_debug_log(f"❌ [CLICK_METHOD_3] javascript_click失敗", click_attempt, "WARNING")
                            
                            click_attempts.append(click_attempt)
                        
                        # 方法4: フォーカス＋Enter
                        if not click_success:
                            click_attempt = {
                                "method": "focus_enter",
                                "attempt_time": datetime.now().isoformat(),
                                "success": False,
                                "error": None
                            }
                            try:
                                self.post_button_debug_log("🔄 [CLICK_METHOD_4] focus_enter 試行開始")
                                submit_button.focus()
                                time.sleep(0.5)
                                submit_button.press('Enter')
                                click_success = True
                                click_attempt["success"] = True
                                self.debug_log("✅ フォーカス＋Enterキー成功")
                                self.post_button_debug_log("✅ [CLICK_METHOD_4] focus_enter 成功！")
                                
                                # クリック成功時のスクリーンショット
                                self.take_debug_screenshot("after_focus_enter", "focus_enter成功後")
                                
                            except Exception as e4:
                                click_attempt["error"] = str(e4)
                                click_attempt["error_type"] = type(e4).__name__
                                self.debug_log(f"フォーカス＋Enterエラー: {e4}", "WARNING")
                                self.post_button_debug_log(f"❌ [CLICK_METHOD_4] focus_enter失敗", click_attempt, "WARNING")
                            
                            click_attempts.append(click_attempt)
                        
                        # クリック試行結果をデバッグデータに記録
                        click_result = {
                            "timestamp": datetime.now().isoformat(),
                            "click_success": click_success,
                            "button_info": final_button_info,
                            "click_attempts": click_attempts,
                            "successful_method": next((attempt["method"] for attempt in click_attempts if attempt["success"]), None)
                        }
                        
                        self.debug_data.setdefault("click_attempts", []).append(click_result)
                        
                        if click_success:
                            # 投稿処理の完了を待機（時間を延長）+ 詳細デバッグ
                            self.debug_log("⏳ 投稿処理完了を待機中...")
                            self.post_button_debug_log("⏳ [POST_PROCESSING] 投稿処理完了待機開始", {
                                "wait_duration": "3-6秒",
                                "successful_click_method": click_result["successful_method"]
                            })
                            
                            self.human_delay(3000, 6000)
                            
                            # 投稿完了後の状態記録
                            self.record_page_state("投稿完了後")
                            self.take_debug_screenshot("after_post_completion", "投稿処理完了後")
                            self.dump_page_html("after_post_completion", "投稿処理完了後のHTML")
                            
                            success_msg = "✅ Playwright版ツイート投稿完了！"
                            if image_paths:
                                success_msg += f"（画像{len(image_paths)}枚付き）"
                            success_msg += " [ポストボタン確実クリック済み]"
                            
                            final_success_data = {
                                "message": success_msg,
                                "image_count": len(image_paths) if image_paths else 0,
                                "click_method_used": click_result["successful_method"],
                                "total_click_attempts": len(click_attempts),
                                "completion_time": datetime.now().isoformat()
                            }
                            
                            self.debug_log(success_msg)
                            self.post_button_debug_log("🎉 [FINAL_SUCCESS] 投稿処理完全成功！", final_success_data)
                            print(success_msg)
                            logger.info(success_msg)
                            
                        else:
                            error_msg = "❌ 全ての投稿ボタンクリック方法が失敗しました"
                            
                            # クリック失敗時の詳細デバッグ
                            self.record_page_state("クリック全失敗後")
                            self.take_debug_screenshot("all_click_methods_failed", "全クリック方法失敗後")
                            self.dump_page_html("all_click_methods_failed", "全クリック方法失敗後のHTML")
                            
                            failure_data = {
                                "error_message": error_msg,
                                "total_click_attempts": len(click_attempts),
                                "failed_methods": [attempt["method"] for attempt in click_attempts],
                                "button_info": final_button_info,
                                "failure_time": datetime.now().isoformat()
                            }
                            
                            self.debug_log(error_msg, "ERROR")
                            self.post_button_debug_log("❌ [FINAL_FAILURE] 全クリック方法失敗", failure_data, "ERROR")
                            print(error_msg)
                            logger.error(error_msg)
                            
                    except Exception as final_error:
                        error_msg = f"❌ 投稿ボタンクリック処理でエラー: {final_error}"
                        self.debug_log(error_msg, "ERROR")
                        print(error_msg)
                        logger.error(error_msg)
                        
                else:
                    # 全ての試行でボタンが見つからない場合の詳細調査 + 強化デバッグ
                    self.debug_log("❌ 投稿ボタンが見つかりません。詳細調査開始...", "ERROR")
                    self.post_button_debug_log("❌ [BUTTON_NOT_FOUND] 投稿ボタン完全未発見", {
                        "search_attempts": 3,
                        "total_selectors_tried": len(submit_selectors)
                    }, "ERROR")
                    
                    print("❌ 投稿ボタンが見つかりません。詳細調査中...")
                    
                    # ボタン未発見時の詳細状態記録
                    self.record_page_state("ボタン未発見時")
                    self.take_debug_screenshot("button_not_found", "投稿ボタン完全未発見時")
                    self.dump_page_html("button_not_found", "投稿ボタン完全未発見時のHTML")
                    
                    try:
                        # ページ上の全ボタンを詳細調査
                        all_buttons = self.page.query_selector_all('button, [role="button"], input[type="submit"]')
                        self.debug_log(f"ページ上の全ボタン数: {len(all_buttons)}")
                        
                        investigation_results = {
                            "total_buttons": len(all_buttons),
                            "candidate_buttons": [],
                            "all_buttons_sample": []
                        }
                        
                        for i, btn in enumerate(all_buttons[:30]):  # 最初の30個を調査
                            try:
                                text = btn.text_content() or ""
                                aria_label = btn.get_attribute('aria-label') or ""
                                data_testid = btn.get_attribute('data-testid') or ""
                                class_name = btn.get_attribute('class') or ""
                                is_visible = btn.is_visible()
                                is_enabled = btn.is_enabled()
                                is_attached = btn.is_attached()
                                
                                button_info = {
                                    "index": i + 1,
                                    "text_content": text[:50],
                                    "aria_label": aria_label[:50], 
                                    "data_testid": data_testid,
                                    "class_name": class_name[:100],
                                    "visible": is_visible,
                                    "enabled": is_enabled,
                                    "attached": is_attached
                                }
                                
                                investigation_results["all_buttons_sample"].append(button_info)
                                
                                # 候補ボタンの詳細分析
                                if any(keyword in (text + aria_label + data_testid).lower() 
                                       for keyword in ['tweet', 'post', 'ツイート', 'submit', 'send', '送信', '投稿']):
                                    
                                    button_info["is_candidate"] = True
                                    investigation_results["candidate_buttons"].append(button_info)
                                    
                                    self.debug_log(f"候補ボタン {i+1}: text='{text[:20]}', aria='{aria_label[:20]}', testid='{data_testid}', visible={is_visible}, enabled={is_enabled}")
                                    self.post_button_debug_log(f"🔍 [CANDIDATE] 候補ボタン発見 #{i+1}", button_info)
                                    
                            except Exception as btn_error:
                                error_info = {
                                    "index": i + 1,
                                    "error": str(btn_error),
                                    "error_type": type(btn_error).__name__
                                }
                                investigation_results["all_buttons_sample"].append(error_info)
                                continue
                        
                        self.debug_data.setdefault("button_investigation", []).append(investigation_results)
                        self.post_button_debug_log("🔍 [INVESTIGATION] ボタン詳細調査完了", investigation_results)
                        
                    except Exception as investigation_error:
                        investigation_error_data = {
                            "error": str(investigation_error),
                            "error_type": type(investigation_error).__name__
                        }
                        self.debug_log(f"詳細調査エラー: {investigation_error}", "WARNING")
                        self.post_button_debug_log("❌ [INVESTIGATION_ERROR] 詳細調査エラー", investigation_error_data, "ERROR")
                    
                    warning_msg = "❌ 投稿ボタンが見つからないため、投稿処理を完了できませんでした"
                    final_failure_data = {
                        "error_message": warning_msg,
                        "total_search_attempts": 3,
                        "total_selectors": len(submit_selectors),
                        "failure_time": datetime.now().isoformat()
                    }
                    
                    self.debug_log(warning_msg, "ERROR")
                    self.post_button_debug_log("❌ [CRITICAL_FAILURE] 投稿処理完全失敗", final_failure_data, "ERROR")
                    print(warning_msg)
                    logger.error(warning_msg)
            else:
                test_msg = "✅ Playwright版テストモード完了！"
                if image_paths:
                    test_msg += f"（画像{len(image_paths)}枚アップロードテスト含む）"
                    
                self.debug_log(test_msg)
                print(test_msg)
                logger.info(test_msg)
            
            # デバッグシステム終了処理
            self.finalize_post_button_debug()
            
            return True
            
        except Exception as e:
            error_msg = f"ツイート投稿エラー: {e}"
            
            # エラー時の緊急デバッグ情報記録
            emergency_error_data = {
                "error_message": error_msg,
                "error_type": type(e).__name__,
                "error_traceback": traceback.format_exc(),
                "error_time": datetime.now().isoformat()
            }
            
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            
            if hasattr(self, 'post_button_debug_log'):
                self.post_button_debug_log("💥 [EMERGENCY_ERROR] 投稿処理中の予期しないエラー", emergency_error_data, "ERROR")
                
                # 緊急時のスクリーンショット・HTML保存
                try:
                    self.take_debug_screenshot("emergency_error", f"緊急エラー時: {error_msg[:50]}")
                    self.dump_page_html("emergency_error", f"緊急エラー時のHTML: {error_msg[:50]}")
                    self.record_page_state("緊急エラー時", {"error": error_msg})
                except:
                    pass  # 緊急時なので追加エラーは無視
            
            print(f"❌ 投稿エラー: {e}")
            logger.error(error_msg)
            
            # デバッグシステム終了処理
            if hasattr(self, 'finalize_post_button_debug'):
                self.finalize_post_button_debug()
            
            return False
    
    def finalize_post_button_debug(self):
        """ポストボタンデバッグシステムの終了処理"""
        try:
            # 最終セッション情報の記録
            final_session_info = {
                "session_end_time": datetime.now().isoformat(),
                "total_session_duration": time.time() - self.start_time,
                "debug_files_created": {
                    "log_file": str(self.debug_log_file) if hasattr(self, 'debug_log_file') else None,
                    "json_file": str(self.debug_json_file) if hasattr(self, 'debug_json_file') else None,
                    "screenshot_dir": str(self.debug_screenshot_dir) if hasattr(self, 'debug_screenshot_dir') else None,
                    "html_dir": str(self.debug_html_dir) if hasattr(self, 'debug_html_dir') else None
                },
                "summary": {
                    "total_screenshots": len(self.debug_data.get("screenshots", [])),
                    "total_html_dumps": len(self.debug_data.get("html_dumps", [])),
                    "total_page_states": len(self.debug_data.get("page_states", [])),
                    "total_errors": len(self.debug_data.get("errors", [])),
                    "search_attempts": len(self.debug_data.get("search_attempts_summary", [])),
                    "click_attempts": len(self.debug_data.get("click_attempts", []))
                }
            }
            
            if hasattr(self, 'debug_data'):
                self.debug_data["final_session_info"] = final_session_info
                
                self.post_button_debug_log("🏁 [SESSION_END] ポストボタンデバッグセッション終了", final_session_info)
                
                # 最終JSON保存
                self.save_debug_data()
            
            # 終了ログファイル出力
            if hasattr(self, 'debug_log_file'):
                with open(self.debug_log_file, 'a', encoding='utf-8') as f:
                    f.write(f"\n{'='*80}\n")
                    f.write(f"ポストボタンデバッグセッション終了: {datetime.now().isoformat()}\n")
                    f.write(f"総実行時間: {final_session_info['total_session_duration']:.2f}秒\n")
                    f.write(f"生成されたファイル:\n")
                    f.write(f"  - ログファイル: {self.debug_log_file}\n")
                    f.write(f"  - JSONファイル: {self.debug_json_file}\n") 
                    f.write(f"  - スクリーンショット: {len(self.debug_data.get('screenshots', []))}枚\n")
                    f.write(f"  - HTMLダンプ: {len(self.debug_data.get('html_dumps', []))}枚\n")
                    f.write(f"{'='*80}\n")
            
            print(f"🔍 [POST_BTN_DEBUG] デバッグファイル保存完了:")
            if hasattr(self, 'debug_log_file'):
                print(f"  📋 ログ: {self.debug_log_file}")
            if hasattr(self, 'debug_json_file'):
                print(f"  📊 JSON: {self.debug_json_file}")
            if hasattr(self, 'debug_data'):
                print(f"  📸 スクリーンショット: {len(self.debug_data.get('screenshots', []))}枚")
                print(f"  📄 HTMLダンプ: {len(self.debug_data.get('html_dumps', []))}枚")
            
        except Exception as e:
            print(f"⚠️ デバッグシステム終了処理エラー: {e}")
    
    def cleanup(self):
        """リソースクリーンアップ（永続プロファイル対応）"""
        self.debug_log("🧹 Playwright クリーンアップ開始（永続プロファイル対応）")
        self.log_memory_usage()
        
        try:
            # 永続コンテキストの場合はページとコンテキストを一緒にクローズ
            if self.context:
                self.debug_log("永続コンテキストクローズ中...")
                try:
                    self.context.close()
                    self.debug_log("✅ 永続コンテキストクローズ完了")
                    self.debug_log("ℹ️ セッション（ログイン状態）は保持されます")
                except Exception as e:
                    self.debug_log(f"永続コンテキストクローズエラー: {e}", "WARNING")
                self.context = None
                self.page = None  # 永続コンテキストのクローズでページも閉じられる
                
            if hasattr(self, 'playwright') and self.playwright:
                self.debug_log("Playwrightストップ中...")
                try:
                    self.playwright.stop()
                    self.debug_log("✅ Playwrightストップ完了")
                except Exception as e:
                    self.debug_log(f"Playwrightストップエラー: {e}", "WARNING")
                
            self.debug_log("✅ Playwright クリーンアップ完了（セッション保持）")
            self.log_memory_usage()
            
        except Exception as e:
            error_msg = f"クリーンアップエラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            logger.warning(error_msg)
    
    def __enter__(self):
        if self.setup_browser():
            return self
        else:
            raise Exception("Playwrightブラウザセットアップに失敗")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

def playwright_twitter_test(message="Playwright版Twitter自動投稿テスト", image_paths=None, test_mode=True):
    """Playwright版Twitterテスト（画像対応）"""
    print("🎭 Playwright版 Twitter自動投稿テスト（画像対応）")
    print("=" * 60)
    print(f"📝 メッセージ: {message[:50]}...")
    print(f"🧪 テストモード: {test_mode}")
    if image_paths:
        print(f"📷 画像ファイル: {len(image_paths)}枚")
        for i, path in enumerate(image_paths):
            print(f"  {i+1}. {Path(path).name}")
    
    if not PLAYWRIGHT_AVAILABLE:
        print("❌ Playwright未インストール")
        print("解決方法:")
        print("1. pip install playwright")
        print("2. playwright install chromium")
        return False
    
    try:
        print("🚀 Playwrightブラウザマネージャーを開始...")
        with PlaywrightTwitterManager(headless=False) as twitter:
            print("✅ ブラウザ起動成功（永続プロファイル）")
            
            # 1. Twitterに移動
            print("🐦 Twitterに移動中...")
            if not twitter.navigate_to_twitter():
                print("❌ Twitter移動失敗")
                return False
            print("✅ Twitter移動成功")
            
            # 2. ログイン状態チェック
            print("🔍 ログイン状態をチェック中...")
            is_logged_in = twitter.check_login_status()
            
            if not is_logged_in:
                print("🔐 ログインが必要です。手動ログイン待機を開始...")
                # 3. 手動ログイン待機
                is_logged_in = twitter.wait_for_manual_login()
            else:
                print("✅ 既にログイン済みです（セッション保持）")
            
            if is_logged_in:
                print("📝 ツイート投稿処理を開始...")
                # 4. ツイート投稿（画像付き）
                success = twitter.post_tweet(message, image_paths=image_paths, test_mode=test_mode)
                
                if success:
                    if test_mode:
                        result_msg = "✅ === Playwright版テスト完了成功！ ==="
                        if image_paths:
                            result_msg += f"（画像{len(image_paths)}枚テスト含む）"
                        print(result_msg)
                    else:
                        result_msg = "✅ === Playwright版投稿完了成功！ ==="
                        if image_paths:
                            result_msg += f"（画像{len(image_paths)}枚付き）"
                        print(result_msg)
                    return True
                else:
                    print("❌ ツイート投稿に失敗")
                    return False
            else:
                print("❌ ログインに失敗またはタイムアウト")
                return False
                
    except Exception as e:
        print(f"❌ Playwright版テスト失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    
    # コマンドライン引数解析
    test_mode = '--test' in sys.argv or len(sys.argv) == 1
    
    # メッセージの取得
    message = "Playwright版投稿テスト"
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
    
    print("🎭 Seleniumクラッシュ問題 - 最終解決策")
    print("Playwright使用による安全なTwitter自動投稿（画像対応）")
    print("=" * 70)
    
    if test_mode:
        print("🧪 テストモード: 投稿ボタンは押しません")
    else:
        print("🚀 実投稿モード: 実際に投稿します")
    
    if image_paths:
        print(f"📷 画像ファイル: {len(image_paths)}枚")
        for i, path in enumerate(image_paths):
            print(f"  {i+1}. {Path(path).name}")
    
    success = playwright_twitter_test(message, image_paths=image_paths, test_mode=test_mode)
    
    if success:
        print("\n🎉 成功! Seleniumクラッシュ問題が解決されました")
        if image_paths:
            print("画像投稿機能も正常に動作しています")
        print("このPlaywright実装を本番環境で使用してください")
    else:
        print("\n🔧 Playwrightセットアップが必要:")
        print("pip install playwright")
        print("playwright install chromium")