import os
import time
import random
import sys
from datetime import datetime

# Playwright関連のインポート（条件付き）
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
    print("✅ Playwright利用可能")
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("❌ Playwright未インストール - pip install playwright")

class MobileTwitterManager:
    """
    モバイル版Twitterマネージャー（最適化版）
    Playwright + モバイルエミュレーションで認証問題を回避
    """
    
    def __init__(self, headless=False, profile_dir=None):
        self.headless = headless
        self.page = None
        self.context = None
        self.playwright = None
        
        # プロファイルディレクトリ設定
        if profile_dir:
            self.profile_dir = profile_dir
        else:
            # デフォルトプロファイル（カレントディレクトリの相対パス）
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            self.profile_dir = os.path.join(project_root, "twitter_mobile_profile")
        
        # プロファイルディレクトリの作成
        os.makedirs(self.profile_dir, exist_ok=True)
        
        # デバッグログの設定
        self.setup_debug_logging()
    
    def setup_debug_logging(self):
        """詳細デバッグログファイルの設定"""
        try:
            # デバッグログディレクトリを作成
            current_dir = os.path.dirname(os.path.abspath(__file__))
            log_dir = os.path.join(current_dir, "debug_logs")
            os.makedirs(log_dir, exist_ok=True)
            
            # タイムスタンプ付きのログファイル名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_filename = f"mobile_twitter_debug_{timestamp}.log"
            self.debug_log_path = os.path.join(log_dir, log_filename)
            
            # デバッグログファイルの初期化
            with open(self.debug_log_path, 'w', encoding='utf-8') as f:
                f.write("=== モバイルTwitterデバッグログ開始 ===\n")
                f.write(f"開始時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"ログファイル: {self.debug_log_path}\n")
                f.write("=" * 60 + "\n\n")
            
            # セッション開始時刻を記録
            self.session_start_time = time.time()
            
            self.debug_log(f"モバイルプロファイルディレクトリ: {self.profile_dir}")
            
        except Exception as e:
            print(f"デバッグログ設定エラー: {e}")
            self.debug_log_path = None
            self.session_start_time = time.time()
    
    def debug_log(self, message, level="INFO"):
        """デバッグログ出力"""
        try:
            elapsed = time.time() - self.session_start_time if hasattr(self, 'session_start_time') else 0
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_message = f"[{timestamp}] [{elapsed:.2f}s] [{level}] {message}"
            
            # コンソール出力
            print(log_message)
            
            # ファイル出力
            if hasattr(self, 'debug_log_path') and self.debug_log_path:
                with open(self.debug_log_path, 'a', encoding='utf-8') as f:
                    f.write(log_message + "\n")
                    f.flush()  # 即座にファイルに書き込む
                    
        except Exception as e:
            print(f"デバッグログ出力エラー: {e}")

    def check_text_content(self, element_selector=None, step_name=""):
        """テキストエリアの内容を詳細にチェックする"""
        try:
            if not element_selector:
                # デフォルトのテキストエリアセレクタ
                selectors = [
                    '[data-testid="tweetTextarea_0"]',
                    '.public-DraftEditor-content',
                    '[contenteditable="true"]',
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

    def human_delay(self, min_ms=800, max_ms=2500):
        """モバイルデバイス風の待機時間"""
        delay = random.uniform(min_ms/1000, max_ms/1000)
        self.debug_log(f"モバイル風待機: {delay:.2f}秒")
        time.sleep(delay)

    def mobile_tap(self, element):
        """モバイル風タップ動作（改善版）"""
        try:
            # 複数の方法でタップを試行
            try:
                element.tap()
                self.debug_log("タップ成功")
                return True
            except Exception as e:
                self.debug_log(f"タップ失敗、クリックを試行", "WARNING")
                try:
                    element.click()
                    self.debug_log("クリック成功")
                    return True
                except Exception as e2:
                    self.debug_log(f"クリック失敗、JavaScriptクリックを試行", "WARNING")
                    try:
                        element.evaluate("element => element.click()")
                        self.debug_log("JavaScriptクリック成功")
                        return True
                    except Exception as e3:
                        self.debug_log(f"全てのクリック方法が失敗: {e3}", "ERROR")
                        return False
        except Exception as e:
            self.debug_log(f"モバイルタップエラー: {e}", "ERROR")
            return False

    def mobile_type_simple(self, element, text):
        """フォーカス外れ対応強化版テキスト入力（テキスト消失防止機能付き）"""
        if not text:
            return
        
        try:
            self.debug_log(f"📝 [PROTECTED_TYPE] フォーカス外れ対応テキスト入力開始: {len(text)}文字")
            
            # フォーカスを設定
            element.focus()
            self.human_delay(300, 500)
            
            # 強化版テキスト設定とフォーカス監視
            result = element.evaluate('''(element, text) => {
                try {
                    console.log('[PROTECTED_TYPE] テキスト保護設定開始:', text.length, '文字');
                    
                    // 1. 既存のプロテクターを無効化
                    if (window._textProtectors) {
                        window._textProtectors.forEach(protector => {
                            if (protector.observer) protector.observer.disconnect();
                            if (protector.focusListener) element.removeEventListener('blur', protector.focusListener);
                            if (protector.mutationListener) element.removeEventListener('DOMSubtreeModified', protector.mutationListener);
                        });
                    }
                    window._textProtectors = [];
                    
                    // 2. 強固なテキスト設定（複数属性同時設定）
                    const setText = (elem, txt) => {
                        // すべての可能な属性に同時設定
                        if (elem.value !== undefined) elem.value = txt;
                        if (elem.textContent !== undefined) elem.textContent = txt;
                        if (elem.innerText !== undefined) elem.innerText = txt;
                        if (elem.innerHTML !== undefined) elem.innerHTML = txt;
                        
                        // data属性にもバックアップ保存
                        elem.setAttribute('data-backup-text', txt);
                        elem.setAttribute('data-original-text', txt);
                        
                        console.log('[PROTECTED_TYPE] テキスト強固設定完了');
                    };
                    
                    // 初期テキスト設定
                    setText(element, text);
                    
                    // 3. テキスト復元関数
                    const restoreText = () => {
                        const currentText = element.value || element.textContent || element.innerText || '';
                        const backupText = element.getAttribute('data-backup-text') || text;
                        
                        if (!currentText || currentText.length === 0 || currentText !== backupText) {
                            console.log('[PROTECTED_TYPE] テキスト消失検出、即座復元:', backupText.length, '文字');
                            setText(element, backupText);
                            
                            // UIに反映するためのイベント発火
                            const events = [
                                new Event('input', { bubbles: true, cancelable: true }),
                                new Event('change', { bubbles: true, cancelable: true }),
                                new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' }),
                                new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' })
                            ];
                            
                            events.forEach(evt => {
                                try { element.dispatchEvent(evt); } catch(e) {}
                            });
                            
                            return true;
                        }
                        return false;
                    };
                    
                    // 4. フォーカス監視（blur時の即座復元）
                    const focusProtector = (evt) => {
                        console.log('[PROTECTED_TYPE] フォーカス変更検出');
                        setTimeout(() => restoreText(), 50);  // 50ms後に復元チェック
                        setTimeout(() => restoreText(), 200); // 200ms後にも復元チェック
                    };
                    
                    element.addEventListener('blur', focusProtector, { passive: true });
                    
                    // 5. DOM変更監視（MutationObserver）
                    let mutationObserver = null;
                    if (window.MutationObserver) {
                        mutationObserver = new MutationObserver((mutations) => {
                            let shouldRestore = false;
                            mutations.forEach((mutation) => {
                                if (mutation.type === 'childList' || mutation.type === 'characterData' || 
                                    (mutation.type === 'attributes' && (mutation.attributeName === 'value' || 
                                    mutation.attributeName === 'data-value'))) {
                                    shouldRestore = true;
                                }
                            });
                            
                            if (shouldRestore) {
                                console.log('[PROTECTED_TYPE] DOM変更検出、復元チェック');
                                setTimeout(() => restoreText(), 10);
                            }
                        });
                        
                        mutationObserver.observe(element, {
                            attributes: true,
                            childList: true,
                            characterData: true,
                            subtree: true,
                            attributeOldValue: true,
                            characterDataOldValue: true
                        });
                    }
                    
                    // 6. 定期的な監視（軽量版）
                    const intervalProtector = setInterval(() => {
                        const restored = restoreText();
                        if (!restored) {
                            // テキストが安定している場合の監視頻度を下げる
                            const checkCount = parseInt(element.getAttribute('data-check-count') || '0') + 1;
                            element.setAttribute('data-check-count', checkCount.toString());
                            
                            // 10回チェックしてOKなら監視を5秒に1回に変更
                            if (checkCount > 10) {
                                clearInterval(intervalProtector);
                                setInterval(() => restoreText(), 5000); // 5秒ごと
                                console.log('[PROTECTED_TYPE] 監視を軽量化（5秒間隔）');
                            }
                        }
                    }, 500); // 0.5秒ごと
                    
                    // 7. プロテクター情報を保存
                    window._textProtectors.push({
                        element: element,
                        observer: mutationObserver,
                        focusListener: focusProtector,
                        intervalId: intervalProtector,
                        text: text
                    });
                    
                    // 8. 最終確認とイベント発火
                    setTimeout(() => {
                        restoreText();
                        
                        // 最終的なUIイベント発火
                        const finalEvents = [
                            new Event('input', { bubbles: true }),
                            new Event('change', { bubbles: true })
                        ];
                        
                        finalEvents.forEach(evt => {
                            try { element.dispatchEvent(evt); } catch(e) {}
                        });
                        
                        element.focus();
                        console.log('[PROTECTED_TYPE] テキスト保護設定完了');
                    }, 100);
                    
                    return { 
                        success: true, 
                        finalValue: element.value || element.textContent || element.innerText || '',
                        protectionEnabled: true,
                        watchersCount: window._textProtectors.length
                    };
                    
                } catch (error) {
                    console.error('[PROTECTED_TYPE] エラー:', error);
                    return { success: false, error: error.message };
                }
            }''', text)
            
            if result['success']:
                self.debug_log(f"✅ [PROTECTED_TYPE] テキスト保護設定完了: {len(result['finalValue'])}文字")
                self.debug_log(f"  - 保護機能: {result.get('protectionEnabled')}")
                self.debug_log(f"  - 監視数: {result.get('watchersCount')}")
            else:
                self.debug_log(f"❌ [PROTECTED_TYPE] テキスト設定エラー: {result.get('error')}", "ERROR")
                
        except Exception as e:
            self.debug_log(f"❌ [PROTECTED_TYPE] 例外エラー: {e}", "ERROR")
    

    def setup_mobile_browser(self):
        """モバイルブラウザセットアップ"""
        if not PLAYWRIGHT_AVAILABLE:
            raise Exception("Playwright未インストール。pip install playwright 実行後、playwright install chromium を実行してください")
        
        try:
            self.debug_log("📱 モバイルブラウザ起動開始")
            
            self.playwright = sync_playwright().start()
            self.debug_log("✅ Playwright インスタンス作成完了")
            
            # プロファイルディレクトリの準備
            if os.path.exists(self.profile_dir):
                self.debug_log(f"✅ 既存モバイルプロファイル発見: {self.profile_dir}")
            else:
                os.makedirs(self.profile_dir, exist_ok=True)
                self.debug_log(f"📁 新規モバイルプロファイル作成: {self.profile_dir}")
            
            # iPhone 14 Pro Max設定
            mobile_args = [
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-component-extensions-with-background-pages',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                '--disable-infobars',
                '--disable-notifications',
                '--disable-popup-blocking',
                '--disable-save-password-bubble',
                '--disable-translate',
                '--disable-features=VizDisplayCompositor',
                '--disable-ipc-flooding-protection',
                '--enable-features=NetworkService,NetworkServiceLogging',
                '--force-device-scale-factor=3',
                '--window-size=430,932',
                '--viewport-size=430,932'
            ]
            
            self.debug_log(f"モバイル引数設定完了: {len(mobile_args)}個")
            
            # モバイルコンテキスト作成
            self.debug_log("モバイルコンテキスト作成中...")
            self.context = self.playwright.chromium.launch_persistent_context(
                user_data_dir=self.profile_dir,
                headless=self.headless,
                args=mobile_args,
                viewport={'width': 430, 'height': 932},
                device_scale_factor=3,
                is_mobile=True,
                has_touch=True,
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                locale='ja-JP',
                timezone_id='Asia/Tokyo',
                permissions=['geolocation'],
                extra_http_headers={
                    'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            )
            
            self.debug_log("✅ モバイルコンテキスト作成完了")
            
            # 既存ページを使用または新規作成
            if self.context.pages:
                self.page = self.context.pages[0]
                self.debug_log("既存モバイルページを使用")
            else:
                self.page = self.context.new_page()
                self.debug_log("新規モバイルページ作成")
            
            # モバイル偽装スクリプトの実行
            self.page.evaluate('''
                () => {
                    // navigator.webdriver を隠す
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });
                    
                    // プラットフォーム偽装
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'iPhone',
                    });
                    
                    // タッチイベントサポート
                    Object.defineProperty(navigator, 'maxTouchPoints', {
                        get: () => 5,
                    });
                    
                    // モバイルブラウザの特徴を追加
                    window.orientation = 0;
                    window.screen.orientation = { angle: 0, type: 'portrait-primary' };
                }
            ''')
            
            self.debug_log("✅ モバイル偽装スクリプト適用完了")
            self.debug_log("📱 モバイルブラウザ起動成功")
            
            return True
            
        except Exception as e:
            error_msg = f"モバイルブラウザセットアップエラー: {e}"
            self.debug_log(error_msg, "ERROR")
            return False

    def navigate_to_mobile_twitter(self):
        """モバイル版Twitterに移動"""
        try:
            self.debug_log("📱 モバイル版Twitterに移動開始")
            twitter_url = "https://mobile.twitter.com"
            self.debug_log(f"アクセス先: {twitter_url}")
            
            self.page.goto(twitter_url, wait_until='domcontentloaded', timeout=60000)
            self.debug_log("✅ ページ移動完了")
            
            # モバイル風待機
            self.human_delay()
            
            # 現在のURLとタイトルを確認
            current_url = self.page.url
            page_title = self.page.title()
            self.debug_log(f"現在のURL: {current_url}")
            self.debug_log(f"ページタイトル: {page_title}")
            
            return True
            
        except Exception as e:
            error_msg = f"モバイルTwitter移動エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            return False
    
    def upload_images_mobile(self, image_paths):
        """モバイル版で画像をアップロード（ファイルダイアログ回避強化版）"""
        try:
            for i, image_path in enumerate(image_paths):
                self.debug_log(f"画像{i+1}/{len(image_paths)}をアップロード中: {image_path}")
                
                # 画像ファイルの存在確認
                if not os.path.exists(image_path):
                    self.debug_log(f"⚠️ 画像ファイルが見つかりません: {image_path}", "WARNING")
                    continue
                
                # 画像アップロード前の状態チェック（テキストはまだ入力されていない）
                self.check_text_content(step_name=f"プログラマティック画像アップロード前_{i+1}")
                
                self.debug_log("📷 ファイルダイアログ回避モードで画像アップロード開始")
                
                # 画像ファイルをbase64として読み込み
                try:
                    with open(image_path, 'rb') as f:
                        image_data = f.read()
                        import base64
                        base64_data = base64.b64encode(image_data).decode('utf-8')
                    self.debug_log(f"✅ 画像ファイル読み込み完了: {len(base64_data)} bytes")
                except Exception as e:
                    self.debug_log(f"❌ 画像ファイル読み込みエラー: {e}", "ERROR")
                    continue
                
                # 完全プログラマティック画像アップロード（ダイアログ完全回避）
                filename = os.path.basename(image_path)
                self.debug_log(f"🚀 プログラマティック画像アップロード実行: {filename}")
                
                result = self.page.evaluate('''
                    (args) => {
                        const { base64Data, fileName } = args;
                        try {
                            console.log('[MOBILE DEBUG] プログラマティック画像アップロード開始');
                            console.log('[MOBILE DEBUG] ファイル名:', fileName);
                            console.log('[MOBILE DEBUG] base64データ長:', base64Data.length);
                            
                            // 1. 隠れたファイル入力要素を作成（完全に見えない）
                            const hiddenInput = document.createElement('input');
                            hiddenInput.type = 'file';
                            hiddenInput.accept = 'image/*';
                            hiddenInput.multiple = false;
                            hiddenInput.style.position = 'fixed';
                            hiddenInput.style.top = '-9999px';
                            hiddenInput.style.left = '-9999px';
                            hiddenInput.style.width = '1px';
                            hiddenInput.style.height = '1px';
                            hiddenInput.style.opacity = '0';
                            hiddenInput.style.pointerEvents = 'none';
                            hiddenInput.style.visibility = 'hidden';
                            hiddenInput.style.zIndex = '-9999';
                            hiddenInput.id = 'programmatic-upload-' + Date.now();
                            document.body.appendChild(hiddenInput);
                            
                            console.log('[MOBILE DEBUG] 隠れたファイル入力要素作成完了');
                            
                            // 2. base64からBlobを作成
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], {type: 'image/png'});
                            console.log('[MOBILE DEBUG] Blob作成完了, サイズ:', blob.size);
                            
                            // 3. Fileオブジェクトを作成
                            const file = new File([blob], fileName, {
                                type: 'image/png',
                                lastModified: Date.now()
                            });
                            console.log('[MOBILE DEBUG] File作成完了:', file.name, file.size);
                            
                            // 4. DataTransferオブジェクトでファイルを設定
                            const dt = new DataTransfer();
                            dt.items.add(file);
                            hiddenInput.files = dt.files;
                            
                            console.log('[MOBILE DEBUG] ファイル設定完了, files.length:', hiddenInput.files.length);
                            
                            // 5. Twitterの既存ファイル入力要素を探す
                            const twitterFileInputs = document.querySelectorAll('input[type="file"]');
                            let targetTwitterInput = null;
                            
                            console.log('[MOBILE DEBUG] Twitter既存ファイル入力要素数:', twitterFileInputs.length);
                            
                            // 最も適切なTwitterファイル入力要素を選択
                            for (const input of twitterFileInputs) {
                                if (input !== hiddenInput && (input.accept && input.accept.includes('image'))) {
                                    targetTwitterInput = input;
                                    console.log('[MOBILE DEBUG] Twitter画像用ファイル入力要素発見');
                                    break;
                                }
                            }
                            
                            if (!targetTwitterInput && twitterFileInputs.length > 1) {
                                // 隠れた要素以外で最新のファイル入力要素を使用
                                for (let i = twitterFileInputs.length - 1; i >= 0; i--) {
                                    if (twitterFileInputs[i] !== hiddenInput) {
                                        targetTwitterInput = twitterFileInputs[i];
                                        console.log('[MOBILE DEBUG] Twitter最新ファイル入力要素使用');
                                        break;
                                    }
                                }
                            }
                            
                            if (targetTwitterInput) {
                                console.log('[MOBILE DEBUG] TwitterターゲットでDataTransfer適用開始');
                                
                                // TwitterのファイルinputにもDataTransferを適用
                                targetTwitterInput.files = dt.files;
                                
                                console.log('[MOBILE DEBUG] Twitterファイル設定完了, files.length:', targetTwitterInput.files.length);
                                
                                // 6. テキスト保護しながら最小限のイベントを発火
                                console.log('[MOBILE DEBUG] イベント発火前テキスト保護開始');
                                
                                // テキストエリアの現在の内容を保存
                                const textAreaSelectors = [
                                    '[data-testid="tweetTextarea_0"]',
                                    '.public-DraftEditor-content',
                                    '[contenteditable="true"]',
                                    'textarea',
                                    '[role="textbox"]'
                                ];
                                
                                let currentTextContent = '';
                                let textAreaElement = null;
                                
                                for (const selector of textAreaSelectors) {
                                    const elem = document.querySelector(selector);
                                    if (elem) {
                                        currentTextContent = elem.value || elem.textContent || elem.innerText || '';
                                        if (currentTextContent.trim()) {
                                            textAreaElement = elem;
                                            console.log('[MOBILE DEBUG] テキスト保存:', currentTextContent.length, '文字');
                                            break;
                                        }
                                    }
                                }
                                
                                // 最小限のイベントのみ発火（画像認識に必要な最低限）
                                const minimalEvents = [
                                    new Event('change', { bubbles: true, cancelable: true })
                                ];
                                
                                minimalEvents.forEach(event => {
                                    targetTwitterInput.dispatchEvent(event);
                                });
                                
                                console.log('[MOBILE DEBUG] 最小限イベント発火完了');
                                
                                // イベント発火後、即座にテキストを復元
                                setTimeout(() => {
                                    if (textAreaElement && currentTextContent) {
                                        const newContent = textAreaElement.value || textAreaElement.textContent || textAreaElement.innerText || '';
                                        if (!newContent || newContent.length === 0) {
                                            console.log('[MOBILE DEBUG] テキスト消失検出、即座に復元中...');
                                            if (textAreaElement.value !== undefined) {
                                                textAreaElement.value = currentTextContent;
                                            } else {
                                                textAreaElement.textContent = currentTextContent;
                                            }
                                            
                                            // 復元後にInputイベントを発火してUIに反映
                                            const restoreEvent = new Event('input', { bubbles: true });
                                            textAreaElement.dispatchEvent(restoreEvent);
                                            
                                            console.log('[MOBILE DEBUG] テキスト即座復元完了:', currentTextContent.length, '文字');
                                        }
                                    }
                                }, 100); // 100ms後に復元チェック
                            }
                            
                            // 7. 隠れた要素は最小限のイベントのみ
                            const hiddenEvent = new Event('change', { bubbles: false }); // bubblesをfalseに
                            hiddenInput.dispatchEvent(hiddenEvent);
                            
                            console.log('[MOBILE DEBUG] 隠れた要素最小限イベント発火完了');
                            
                            // 8. 少し後に隠れた要素を削除
                            setTimeout(() => {
                                if (hiddenInput.parentNode) {
                                    hiddenInput.parentNode.removeChild(hiddenInput);
                                    console.log('[MOBILE DEBUG] 隠れた要素削除完了');
                                }
                            }, 2000);
                            
                            return { 
                                success: true, 
                                message: 'プログラマティック画像設定完了（ダイアログ回避）',
                                targetFound: !!targetTwitterInput,
                                filesCount: hiddenInput.files.length
                            };
                            
                        } catch (error) {
                            console.error('[MOBILE DEBUG] エラー:', error);
                            return { 
                                success: false, 
                                error: error.message || 'プログラマティック画像アップロードエラー'
                            };
                        }
                    }
                ''', {'base64Data': base64_data, 'fileName': filename})
                
                if result and result.get('success'):
                    self.debug_log(f"✅ プログラマティック画像アップロード成功: {result.get('message')}")
                    self.debug_log(f"  - Twitterターゲット発見: {result.get('targetFound')}")
                    self.debug_log(f"  - ファイル数: {result.get('filesCount')}")
                else:
                    self.debug_log(f"❌ プログラマティック画像アップロードエラー: {result.get('error') if result else '不明なエラー'}", "ERROR")
                
                # アップロード処理完了を待つ
                self.human_delay(2000, 3000)
                
                # 画像アップロード後の状態チェック（復元処理不要）
                self.check_text_content(step_name=f"プログラマティック画像アップロード後_{i+1}")
                
                # 画像プレビューが表示されているか確認
                preview_selectors = [
                    'img[alt*="Image"]',
                    '[data-testid="attachmentPreview"]',
                    '[data-testid="media-preview"]',
                    '.r-1p0dtai img',
                    '[role="img"]',
                    '[data-testid="tweetPhoto"]'
                ]
                
                preview_found = False
                for selector in preview_selectors:
                    try:
                        preview = self.page.query_selector(selector)
                        if preview and preview.is_visible():
                            self.debug_log(f"✅ 画像プレビュー確認: {selector}")
                            preview_found = True
                            break
                    except:
                        continue
                
                if preview_found:
                    self.debug_log("✅ 画像が正常にプログラマティックアップロードされました")
                else:
                    self.debug_log("⚠️ 画像プレビューが見つかりません（処理継続）", "WARNING")
        
        except Exception as upload_error:
            self.debug_log(f"❌ プログラマティック画像アップロード処理エラー: {upload_error}", "ERROR")
        finally:
            self.debug_log(f"📷 プログラマティック画像アップロード処理完了: {len(image_paths)}枚処理")

    def check_mobile_login_status(self):
        """モバイル版でのログイン状態チェック"""
        try:
            current_url = self.page.url
            self.debug_log(f"モバイルログイン状態チェック - URL: {current_url}")
            
            # ログイン済みかチェック（モバイル版特有のセレクタ）
            login_indicators = [
                'nav[role="navigation"]',  # メインナビゲーション
                '[data-testid="primaryColumn"]',  # メインコンテンツ
                '[aria-label*="ホーム"], [aria-label*="Home"]'  # ホームリンク
            ]
            
            for indicator in login_indicators:
                try:
                    element = self.page.query_selector(indicator)
                    if element and element.is_visible():
                        self.debug_log(f"✅ モバイルログイン要素発見: {indicator}")
                    else:
                        return False
                except:
                    return False
            
            self.debug_log(f"✅ モバイルログイン確認 ({len(login_indicators)}個の要素)")
            return True
            
        except Exception as e:
            self.debug_log(f"モバイルログイン状態チェックエラー: {e}", "ERROR")
            return False

    def wait_for_mobile_login(self, timeout=200):
        """モバイル版でのログイン完了を待機"""
        try:
            self.debug_log(f"📱 モバイル版手動ログイン待機開始（タイムアウト: {timeout}秒）")
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                if self.check_mobile_login_status():
                    elapsed = time.time() - start_time
                    self.debug_log(f"✅ === モバイル版ログイン完了確認 === ({elapsed:.1f}秒)")
                    return True
                
                remaining = timeout - (time.time() - start_time)
                if remaining > 0:
                    self.debug_log(f"⏳ モバイル版ログイン待機中... 残り時間: {remaining:.1f}秒")
                
                time.sleep(3)
            
            self.debug_log(f"❌ モバイル版ログインタイムアウト ({timeout}秒)", "ERROR")
            return False
            
        except Exception as e:
            self.debug_log(f"モバイル版ログイン待機エラー: {e}", "ERROR")
            return False

    def mobile_post_tweet(self, message, image_paths=None, test_mode=True):
        """モバイル版でツイート投稿"""
        try:
            self.debug_log(f"📱 モバイルツイート投稿開始 (テスト: {test_mode})")
            
            current_url = self.page.url
            self.debug_log(f"投稿処理開始時のURL: {current_url}")
            
            # ページ上のボタン要素を調査（デバッグ用）
            try:
                buttons = self.page.query_selector_all('button, [role="button"]')
                self.debug_log(f"ページ上のボタン要素数: {len(buttons)}")
                
                for i, button in enumerate(buttons[:10]):  # 最初の10個のみ表示
                    try:
                        text = button.inner_text()[:20]
                        aria_label = button.get_attribute('aria-label') or ''
                        testid = button.get_attribute('data-testid') or ''
                        href = button.get_attribute('href') or ''
                        self.debug_log(f"ボタン{i+1}: text='{text}', aria-label='{aria_label[:30]}', testid='{testid}', href='{href}'")
                    except:
                        continue
            except Exception as e:
                self.debug_log(f"ボタン調査エラー: {e}", "WARNING")
            
            # モバイル版投稿ボタンを探す
            tweet_button_selectors = [
                '[data-testid="FloatingActionButtons_Tweet_Button"]',  # フローティングボタン
                '[data-testid="SideNav_NewTweet_Button"]',  # サイドナビのツイートボタン
                '[aria-label*="ツイート"], [aria-label*="Tweet"]',  # aria-labelでのマッチ
                'a[href="/compose/tweet"]',  # 直接リンク
                '[data-testid="tweetButton"]',  # 一般的なツイートボタン
            ]
            
            tweet_button = None
            for selector in tweet_button_selectors:
                try:
                    button = self.page.query_selector(selector)
                    if button and button.is_visible():
                        tweet_button = button
                        self.debug_log(f"モバイル投稿ボタン発見: {selector}")
                        break
                except:
                    continue
            
            if not tweet_button:
                self.debug_log("❌ モバイル投稿ボタンが見つかりません", "ERROR")
                return False
            
            # モバイル風待機
            self.human_delay()
            
            # 投稿ボタンをタップ
            if not self.mobile_tap(tweet_button):
                self.debug_log("❌ モバイル投稿ボタンタップ失敗", "ERROR")
                return False
            
            # 投稿画面が表示されるまで待機
            self.human_delay(2000, 3000)
            
            # テキストエリアを探す
            textarea_selectors = [
                '[data-testid="tweetTextarea_0"]',
                '.public-DraftEditor-content',
                '[contenteditable="true"]',
                'textarea',
                '[role="textbox"]'
            ]
            
            textarea = None
            for selector in textarea_selectors:
                try:
                    element = self.page.query_selector(selector)
                    if element and element.is_visible():
                        textarea = element
                        self.debug_log(f"モバイルテキストエリア発見: {selector}")
                        break
                except:
                    continue
            
            if not textarea:
                self.debug_log("❌ モバイルテキストエリアが見つかりません", "ERROR")
                return False
            
            # ★ 新戦略：画像を先に、テキストを後に1回だけ ★
            self.debug_log("📝 [SIMPLE_FLOW] 画像先・テキスト後の単純フロー")
            
            # 1. 画像がある場合は先にアップロード
            if image_paths:
                self.debug_log(f"📷 [SIMPLE_FLOW] 画像アップロード開始: {len(image_paths)}枚")
                self._current_image_paths = image_paths  # 画像パスを保存
                self.upload_images_mobile(image_paths)
                self.human_delay(1000, 1500)  # 画像アップロード後の安定待機
            
            # 2. テキストを1回だけ入力（フォーカスを維持）
            self.debug_log("📝 [SIMPLE_FLOW] テキスト入力（1回のみ）")
            self.mobile_type_simple(textarea, message)
            
            # 3. テキストエリアにフォーカスを維持
            self.debug_log("🎯 [SIMPLE_FLOW] テキストエリアにフォーカス維持")
            textarea.focus()
            self.human_delay(500, 800)  # フォーカス安定待機
            
            self.debug_log(f"✅ モバイルテキスト入力完了: {message[:50]}{'...' if len(message) > 50 else ''}")
            
            # テストモードの場合は実際の投稿をスキップ
            if test_mode:
                self.debug_log("🚫 テストモード: 投稿直前で停止（投稿処理をスキップ）")
                self.debug_log("✅ モバイルテキスト入力完了")
                print("✅ === モバイル版投稿テスト成功！ ===")
                return True
            
            # 実際の投稿処理（テストモードでない場合のみ）- 強化版ポストボタンクリック
            self.debug_log("🚀 [強化版] 実投稿モード: 確実な投稿ボタン探索開始")
            
            # 包括的な投稿ボタンセレクター（モバイル版特化）
            post_button_selectors = [
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
                '[aria-label*="ポスト"]',
                '[role="button"][aria-label*="ツイート"]',
                '[role="button"][aria-label*="Tweet"]',
                '[role="button"][aria-label*="Post"]',
                '[role="button"][aria-label*="ポスト"]',
                'button[type="submit"]',
                'button[class*="tweet"]',
                'button[class*="post"]',
                '.css-18t94o4.css-1dbjc4n.r-l5o3uw button',
                '.css-175oi2r.r-sdzlij button',
                '*[data-testid="tweetButtonInline"]:not([disabled])',
                '*[data-testid="tweetButton"]:not([disabled])'
            ]
            
            # 3回の試行でポストボタンを確実にクリック
            post_success = False
            for attempt in range(3):
                self.debug_log(f"🎯 [強化版] 投稿ボタン探索 試行 {attempt + 1}/3")
                
                post_button = None
                found_selector = None
                
                # 各セレクターを試行
                for selector in post_button_selectors:
                    try:
                        button = self.page.query_selector(selector)
                        if button:
                            # 詳細な要素検証
                            is_visible = button.is_visible()
                            is_enabled = button.is_enabled()
                            is_attached = button.evaluate("element => element.isConnected")
                            button_text = button.inner_text() if is_visible else "N/A"
                            
                            self.debug_log(f"📍 [強化版] ボタン発見: {selector}")
                            self.debug_log(f"   可視: {is_visible}, 有効: {is_enabled}, 接続: {is_attached}")
                            self.debug_log(f"   テキスト: '{button_text}'")
                            
                            if is_visible and is_enabled and is_attached:
                                post_button = button
                                found_selector = selector
                                self.debug_log(f"✅ [強化版] 有効な投稿ボタン確認: {selector}")
                                break
                    except Exception as e:
                        self.debug_log(f"⚠️ [強化版] セレクター {selector} 検証エラー: {e}")
                        continue
                
                if post_button:
                    self.debug_log(f"🎯 [SIMPLE_FLOW] 投稿ボタンクリック試行 {attempt + 1}: {found_selector}")
                    
                    # テキストエリアにフォーカスを維持したまま、JavaScriptでボタンをクリック
                    self.debug_log("🎯 [SIMPLE_FLOW] フォーカス維持したままJSクリック")
                    
                    try:
                        # 現在のフォーカス要素を保存
                        self.page.evaluate('''() => {
                            const activeElement = document.activeElement;
                            if (activeElement) {
                                window._savedFocus = activeElement;
                                console.log('[MOBILE DEBUG] フォーカス要素保存:', activeElement.tagName, activeElement.getAttribute('data-testid'));
                            }
                        }''')
                        
                        # JavaScriptでボタンをクリック（フォーカスを変更しない）
                        click_result = post_button.evaluate('''(button) => {
                            try {
                                // クリックイベントを直接発火（フォーカス変更なし）
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                button.dispatchEvent(clickEvent);
                                
                                // 保存したフォーカスを復元
                                if (window._savedFocus) {
                                    window._savedFocus.focus();
                                    console.log('[MOBILE DEBUG] フォーカス復元完了');
                                }
                                
                                return { success: true };
                            } catch (error) {
                                return { success: false, error: error.message };
                            }
                        }''')
                        
                        if click_result['success']:
                            self.debug_log("✅ [SIMPLE_FLOW] JSクリック成功（フォーカス維持）")
                            post_success = True
                            break
                        else:
                            self.debug_log(f"❌ [SIMPLE_FLOW] JSクリックエラー: {click_result.get('error')}")
                    except Exception as e:
                        self.debug_log(f"❌ [SIMPLE_FLOW] クリック例外: {e}")
                        
                    # フォーカス維持クリックが失敗した場合のみ、通常のクリックを試行
                    if not post_success:
                        try:
                            self.debug_log("🔄 [SIMPLE_FLOW] フォールバック: 通常のJSクリック")
                            post_button.evaluate("element => element.click()")
                            self.human_delay(1000, 2000)
                            
                            # クリック成功判定（URLまたはページ状態の変化確認）
                            current_url = self.page.url
                            if "compose" not in current_url.lower():
                                self.debug_log("✅ [SIMPLE_FLOW] フォールバッククリック成功確認")
                                post_success = True
                            else:
                                self.debug_log("⚠️ [SIMPLE_FLOW] フォールバッククリック効果なし")
                        except Exception as e:
                            self.debug_log(f"❌ [SIMPLE_FLOW] フォールバッククリックエラー: {e}")
                    
                    if post_success:
                        break
                else:
                    self.debug_log(f"❌ [強化版] 試行 {attempt + 1}: 投稿ボタンが見つかりません")
                
                # 次の試行前に少し待機
                if attempt < 2:
                    self.debug_log(f"⏳ [強化版] 次の試行まで待機...")
                    self.human_delay(1500, 2500)
            
            if post_success:
                self.debug_log("🎉 [強化版] [ポストボタン確実クリック済み] 投稿処理成功")
                self.human_delay(3000, 5000)  # 投稿完了を待機
                
                # ★ 投稿後の最終確認処理 ★
                self.debug_log("🔍 [POST-VALIDATION] 投稿完了後の最終確認開始")
                try:
                    final_url = self.page.url
                    self.debug_log(f"📍 [POST-VALIDATION] 投稿後URL: {final_url}")
                    
                    # ホーム画面に戻ったかチェック
                    if "home" in final_url or "x.com" in final_url:
                        self.debug_log("✅ [POST-VALIDATION] ホーム画面への遷移確認")
                        
                        # 投稿成功の画面要素を探す
                        success_indicators = [
                            '[data-testid="toast"]',  # 成功トースト
                            '[aria-live="polite"]',   # スクリーンリーダー用メッセージ
                            '.r-1awozwy'              # 成功メッセージ的なクラス
                        ]
                        
                        for indicator in success_indicators:
                            try:
                                element = self.page.query_selector(indicator)
                                if element:
                                    text = element.inner_text()
                                    self.debug_log(f"📢 [POST-VALIDATION] 成功インジケーター発見: {text}")
                                    break
                            except:
                                continue
                    else:
                        self.debug_log(f"⚠️ [POST-VALIDATION] 予期しないURL: {final_url}")
                    
                    # 投稿内容の最終ログ出力
                    self.debug_log("=" * 60)
                    self.debug_log("📊 [FINAL-SUMMARY] 投稿処理完了サマリー")
                    self.debug_log("=" * 60)
                    self.debug_log(f"📝 投稿メッセージ長: {len(message)}文字")
                    self.debug_log(f"📝 投稿メッセージ内容: {message[:200]}{'...' if len(message) > 200 else ''}")
                    self.debug_log(f"📷 画像アップロード: {'あり' if hasattr(self, '_current_image_paths') and self._current_image_paths else 'なし'}")
                    self.debug_log(f"🌐 最終URL: {final_url}")
                    self.debug_log(f"⏰ 投稿完了時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                    self.debug_log("=" * 60)
                    
                except Exception as e:
                    self.debug_log(f"⚠️ [POST-VALIDATION] 投稿後確認エラー: {e}", "WARNING")
                
                self.debug_log("✅ === モバイル版投稿完了成功！ ===")
                print("✅ === モバイル版投稿完了成功！ ===")
                return True
            else:
                # 詳細な調査ログ
                self.debug_log("🔍 [強化版] 投稿ボタン発見失敗 - 詳細調査開始")
                try:
                    all_buttons = self.page.query_selector_all('button, [role="button"], input[type="submit"]')
                    self.debug_log(f"🔍 [強化版] ページ内総ボタン数: {len(all_buttons)}")
                    
                    for i, btn in enumerate(all_buttons[:10]):  # 最初の10個のみ調査
                        try:
                            btn_text = btn.inner_text()[:30] if btn.is_visible() else "非表示"
                            btn_aria = btn.get_attribute('aria-label') or ""
                            btn_testid = btn.get_attribute('data-testid') or ""
                            self.debug_log(f"  ボタン{i+1}: text='{btn_text}', aria='{btn_aria[:20]}', testid='{btn_testid}'")
                        except:
                            continue
                except Exception as e:
                    self.debug_log(f"🔍 [強化版] 詳細調査エラー: {e}")
                
                self.debug_log("❌ [強化版] 全ての試行が失敗しました")
                return False
                
        except Exception as e:
            error_msg = f"モバイルツイート投稿エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            print(f"❌ モバイル版投稿エラー: {e}")
            return False



    def cleanup_mobile(self):
        """モバイルブラウザのクリーンアップ"""
        try:
            self.debug_log("🧹 モバイルブラウザ クリーンアップ開始")
            
            if self.context:
                self.context.close()
                self.debug_log("✅ モバイルコンテキストクローズ完了")
                
            if self.playwright:
                self.playwright.stop()
                self.debug_log("✅ Playwrightストップ完了")
                
            # デバッグログファイルに終了情報を記録
            if hasattr(self, 'debug_log_path') and self.debug_log_path:
                try:
                    with open(self.debug_log_path, 'a', encoding='utf-8') as f:
                        f.write(f"\n=== モバイルTwitterデバッグログ終了 ===\n")
                        f.write(f"終了時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                        f.write(f"総実行時間: {time.time() - self.session_start_time:.2f}秒\n")
                        f.write("=" * 60 + "\n")
                    self.debug_log(f"📋 詳細デバッグログ保存完了: {self.debug_log_path}")
                except Exception as e:
                    print(f"デバッグログ終了処理エラー: {e}")
                    
        except Exception as e:
            self.debug_log(f"クリーンアップエラー: {e}", "ERROR")

def main():
    """メイン処理（スタンドアロン実行用）"""
    if len(sys.argv) < 2:
        print("使用方法: python mobile_twitter_manager.py \"投稿メッセージ\" [画像パス1] [画像パス2] ... [--test]")
        return
    
    message = sys.argv[1]
    image_paths = []
    test_mode = True  # デフォルトはテストモード
    
    # 引数解析
    for arg in sys.argv[2:]:
        if arg == "--test":
            test_mode = True
        elif arg == "--post":
            test_mode = False
        else:
            if os.path.exists(arg):
                image_paths.append(arg)
    
    print(f"📱 モバイル版Twitter投稿開始")
    print(f"メッセージ: {message}")
    print(f"画像: {len(image_paths)}枚")
    print(f"モード: {'テスト' if test_mode else '実投稿'}")
    
    manager = None
    try:
        manager = MobileTwitterManager(headless=False)
        
        if not manager.setup_mobile_browser():
            print("❌ モバイルブラウザセットアップ失敗")
            return
        
        if not manager.navigate_to_mobile_twitter():
            print("❌ モバイルTwitter移動失敗")
            return
        
        # ログイン状態確認
        if manager.check_mobile_login_status():
            print("✅ 既にモバイルログイン済みです")
        else:
            print("📱 モバイル版で手動ログインしてください...")
            if not manager.wait_for_mobile_login():
                print("❌ モバイルログインタイムアウト")
                return
        
        # ツイート投稿
        if manager.mobile_post_tweet(message, image_paths, test_mode):
            mode_text = "テスト完了" if test_mode else "投稿完了"
            print(f"✅ モバイル版{mode_text}成功")
        else:
            print("❌ モバイル版投稿失敗")
            
    except KeyboardInterrupt:
        print("\n⚠️ ユーザーによる中断")
    except Exception as e:
        print(f"❌ エラー: {e}")
    finally:
        if manager:
            manager.cleanup_mobile()

if __name__ == "__main__":
    main()