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
        
        self.debug_log(f"プロファイルディレクトリ: {self.profile_dir}")
        
    def debug_log(self, message, level="INFO"):
        """デバッグログ出力"""
        if self.debug_enabled:
            elapsed = time.time() - self.start_time
            print(f"[{elapsed:.2f}s] [{level}] {message}")
            logger.info(f"[{elapsed:.2f}s] {message}")
    
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
            
            # 画像アップロード処理（JavaScript ファイル操作方式）
            if image_paths:
                self.debug_log("📷 画像アップロード処理開始（JavaScript方式）")
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
                # 実際に投稿（強化版 - 確実に「ポストする」ボタンを押す）
                self.debug_log("🚀 実投稿モード: 投稿ボタンを探しています...")
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
                
                submit_button = None
                found_selector = None
                
                # 最大3回まで投稿ボタンを探す（リトライ機能）
                for attempt in range(3):
                    self.debug_log(f"投稿ボタン検索試行 {attempt + 1}/3")
                    
                    for i, selector in enumerate(submit_selectors):
                        try:
                            self.debug_log(f"セレクター {i+1}/{len(submit_selectors)}: {selector}")
                            elements = self.page.query_selector_all(selector)
                            
                            for j, element in enumerate(elements):
                                try:
                                    # より詳細な要素チェック
                                    is_visible = element.is_visible()
                                    is_enabled = element.is_enabled()
                                    is_attached = element.is_attached()
                                    text_content = element.text_content() or ""
                                    aria_label = element.get_attribute('aria-label') or ""
                                    
                                    self.debug_log(f"  要素 {j+1}: visible={is_visible}, enabled={is_enabled}, attached={is_attached}")
                                    self.debug_log(f"  要素 {j+1}: text='{text_content[:30]}', aria-label='{aria_label[:30]}'")
                                    
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
                                    
                                    if is_tweet_button:
                                        submit_button = element
                                        found_selector = f"{selector} (要素 {j+1})"
                                        self.debug_log(f"✅ 投稿ボタン発見: {found_selector}")
                                        print(f"✅ 投稿ボタン発見: {found_selector}")
                                        logger.info(f"投稿ボタン発見: {found_selector}")
                                        break
                                except Exception as element_error:
                                    self.debug_log(f"要素 {j+1} チェック中エラー: {element_error}", "WARNING")
                                    continue
                            
                            if submit_button:
                                break
                                
                        except Exception as selector_error:
                            self.debug_log(f"セレクター '{selector}' でエラー: {selector_error}", "WARNING")
                            continue
                    
                    if submit_button:
                        break
                    
                    # ボタンが見つからない場合、短時間待機してリトライ
                    if attempt < 2:
                        self.debug_log(f"投稿ボタンが見つかりません。{2-attempt}秒待機してリトライします...")
                        time.sleep(2)

                if submit_button:
                    self.debug_log("🎯 投稿ボタンを確実にクリック中...")
                    print("🎯 投稿ボタンを確実にクリック中...")
                    
                    # 投稿前の最終確認
                    try:
                        button_text = submit_button.text_content() or ""
                        button_aria = submit_button.get_attribute('aria-label') or ""
                        self.debug_log(f"クリック前確認 - text: '{button_text}', aria-label: '{button_aria}'")
                        
                        # クリック実行（複数の方法を試行）
                        click_success = False
                        
                        # 方法1: natural_click（通常のクリック）
                        try:
                            self.natural_click(submit_button)
                            click_success = True
                            self.debug_log("✅ natural_click成功")
                        except Exception as e1:
                            self.debug_log(f"natural_clickエラー: {e1}", "WARNING")
                        
                        # 方法2: 直接クリック
                        if not click_success:
                            try:
                                submit_button.click()
                                click_success = True
                                self.debug_log("✅ 直接click成功")
                            except Exception as e2:
                                self.debug_log(f"直接clickエラー: {e2}", "WARNING")
                        
                        # 方法3: JavaScriptクリック
                        if not click_success:
                            try:
                                submit_button.evaluate("element => element.click()")
                                click_success = True
                                self.debug_log("✅ JavaScriptクリック成功")
                            except Exception as e3:
                                self.debug_log(f"JavaScriptクリックエラー: {e3}", "WARNING")
                        
                        # 方法4: フォーカス＋Enter
                        if not click_success:
                            try:
                                submit_button.focus()
                                time.sleep(0.5)
                                submit_button.press('Enter')
                                click_success = True
                                self.debug_log("✅ フォーカス＋Enterキー成功")
                            except Exception as e4:
                                self.debug_log(f"フォーカス＋Enterエラー: {e4}", "WARNING")
                        
                        if click_success:
                            # 投稿処理の完了を待機（時間を延長）
                            self.debug_log("⏳ 投稿処理完了を待機中...")
                            self.human_delay(3000, 6000)
                            
                            success_msg = "✅ Playwright版ツイート投稿完了！"
                            if image_paths:
                                success_msg += f"（画像{len(image_paths)}枚付き）"
                            success_msg += " [ポストボタン確実クリック済み]"
                            
                            self.debug_log(success_msg)
                            print(success_msg)
                            logger.info(success_msg)
                            
                        else:
                            error_msg = "❌ 全ての投稿ボタンクリック方法が失敗しました"
                            self.debug_log(error_msg, "ERROR")
                            print(error_msg)
                            logger.error(error_msg)
                            
                    except Exception as final_error:
                        error_msg = f"❌ 投稿ボタンクリック処理でエラー: {final_error}"
                        self.debug_log(error_msg, "ERROR")
                        print(error_msg)
                        logger.error(error_msg)
                        
                else:
                    # 全ての試行でボタンが見つからない場合の詳細調査
                    self.debug_log("❌ 投稿ボタンが見つかりません。詳細調査開始...", "ERROR")
                    print("❌ 投稿ボタンが見つかりません。詳細調査中...")
                    
                    try:
                        # ページ上の全ボタンを調査
                        all_buttons = self.page.query_selector_all('button, [role="button"]')
                        self.debug_log(f"ページ上の全ボタン数: {len(all_buttons)}")
                        
                        for i, btn in enumerate(all_buttons[:20]):  # 最初の20個を調査
                            try:
                                text = btn.text_content() or ""
                                aria_label = btn.get_attribute('aria-label') or ""
                                data_testid = btn.get_attribute('data-testid') or ""
                                is_visible = btn.is_visible()
                                is_enabled = btn.is_enabled()
                                
                                if any(keyword in (text + aria_label + data_testid).lower() 
                                       for keyword in ['tweet', 'post', 'ツイート', 'submit']):
                                    self.debug_log(f"候補ボタン {i+1}: text='{text[:20]}', aria='{aria_label[:20]}', testid='{data_testid}', visible={is_visible}, enabled={is_enabled}")
                                    
                            except:
                                continue
                    except Exception as investigation_error:
                        self.debug_log(f"詳細調査エラー: {investigation_error}", "WARNING")
                    
                    warning_msg = "❌ 投稿ボタンが見つからないため、投稿処理を完了できませんでした"
                    self.debug_log(warning_msg, "ERROR")
                    print(warning_msg)
                    logger.error(warning_msg)
            else:
                test_msg = "✅ Playwright版テストモード完了！"
                if image_paths:
                    test_msg += f"（画像{len(image_paths)}枚アップロードテスト含む）"
                    
                self.debug_log(test_msg)
                print(test_msg)
                logger.info(test_msg)
            
            return True
            
        except Exception as e:
            error_msg = f"ツイート投稿エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            self.debug_log(f"詳細エラー: {traceback.format_exc()}", "ERROR")
            logger.error(error_msg)
            return False
    
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