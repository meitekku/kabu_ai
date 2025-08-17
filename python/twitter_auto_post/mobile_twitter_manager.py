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

    def mobile_type(self, element, text, clear_first=False):
        """モバイル風タイピング（1文字タイピング + ペースト改善版）"""
        if not text:
            return
        
        try:
            self.debug_log(f"🎯 [DEBUG] mobile_type開始: clear_first={clear_first}, text='{text[:50]}{'...' if len(text) > 50 else ''}'")
            
            # 要素のフォーカス
            element.focus()
            self.human_delay(200, 500)
            
            # 既存テキストのクリア（必要な場合）
            if clear_first:
                current_value = element.evaluate("element => element.value || element.textContent || element.innerText || ''")
                self.debug_log(f"📝 [DEBUG] モバイル設定前の現在値: '{current_value[:50]}{'...' if len(current_value) > 50 else ''}'")
                
                # JavaScriptでダイレクトにクリア
                element.evaluate("element => { if (element.value !== undefined) { element.value = ''; } else { element.textContent = ''; element.innerText = ''; } }")
                self.human_delay(100, 300)
            
            # JavaScriptによる直接入力（最も確実）
            self.debug_log(f"📝 JavaScript直接入力開始: '{text[:50]}{'...' if len(text) > 50 else ''}'")
            
            # 現在の値を取得
            before_value = element.evaluate("element => element.value || element.textContent || element.innerText || ''")
            
            # JavaScriptで直接設定
            element.evaluate('''
                (element, newText) => {
                    if (element.value !== undefined) {
                        element.value = newText;
                    } else {
                        element.textContent = newText;
                        element.innerText = newText;
                    }
                    
                    // 入力イベントを発火
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('keyup', { bubbles: true }));
                }
            ''', text)
            
            # 設定後の値を確認
            after_value = element.evaluate("element => element.value || element.textContent || element.innerText || ''")
            self.debug_log(f"🔧 [DEBUG] モバイルJS設定結果 - before: '{before_value[:50]}{'...' if len(before_value) > 50 else ''}', after: '{after_value[:50]}{'...' if len(after_value) > 50 else ''}'")
            
            self.debug_log(f"✅ JavaScript直接入力完了: '{text[:50]}{'...' if len(text) > 50 else ''}'")
            
            # 短時間待機
            self.human_delay(300, 800)
            
            # 最終確認
            final_value = element.evaluate("element => element.value || element.textContent || element.innerText || ''")
            self.debug_log(f"🎯 [DEBUG] モバイル最終結果: '{final_value[:50]}{'...' if len(final_value) > 50 else ''}'")
            
        except Exception as e:
            self.debug_log(f"❌ モバイル入力エラー: {e}", "ERROR")
            
            # フォールバック：1文字ずつ入力
            try:
                self.debug_log("フォールバック：1文字ずつ入力を試行")
                for char in text:
                    element.type(char)
                    time.sleep(random.uniform(0.01, 0.05))
                self.debug_log("フォールバック入力完了")
            except Exception as fallback_error:
                self.debug_log(f"フォールバック入力も失敗: {fallback_error}", "ERROR")

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
    
    def upload_images_mobile(self, image_paths, original_text=None):
        """モバイル版で画像をアップロード（ファイルダイアログ回避強化版）"""
        try:
            for i, image_path in enumerate(image_paths):
                self.debug_log(f"画像{i+1}/{len(image_paths)}をアップロード中: {image_path}")
                
                # 画像ファイルの存在確認
                if not os.path.exists(image_path):
                    self.debug_log(f"⚠️ 画像ファイルが見つかりません: {image_path}", "WARNING")
                    continue
                
                # ファイルアップロード前のテキスト状態を保存
                current_text = self.check_text_content(step_name=f"プログラマティック画像アップロード前_{i+1}")
                
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
                                
                                // 6. 必要なイベントを発火（ダイアログを開かない方法）
                                const events = [
                                    new Event('change', { bubbles: true, cancelable: true }),
                                    new Event('input', { bubbles: true, cancelable: true }),
                                    new Event('loadstart', { bubbles: true }),
                                    new Event('load', { bubbles: true }),
                                    new Event('loadend', { bubbles: true })
                                ];
                                
                                events.forEach(event => {
                                    targetTwitterInput.dispatchEvent(event);
                                });
                                
                                console.log('[MOBILE DEBUG] Twitterイベント発火完了');
                            }
                            
                            // 7. 隠れた要素のイベントも発火
                            const hiddenEvents = [
                                new Event('change', { bubbles: true }),
                                new Event('input', { bubbles: true })
                            ];
                            
                            hiddenEvents.forEach(event => {
                                hiddenInput.dispatchEvent(event);
                            });
                            
                            console.log('[MOBILE DEBUG] 隠れた要素イベント発火完了');
                            
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
                
                # テキスト状態をチェックして復元が必要か確認
                text_after_upload = self.check_text_content(step_name=f"プログラマティック画像アップロード後_{i+1}")
                
                # テキストが削除された場合の復元処理
                if current_text and (not text_after_upload or len(text_after_upload.strip()) == 0):
                    self.debug_log(f"⚠️ プログラマティック画像アップロードでテキストが削除されました。復元します", "WARNING")
                    try:
                        text_area = self.page.query_selector('[data-testid="tweetTextarea_0"], .public-DraftEditor-content, [contenteditable="true"], textarea, [role="textbox"]')
                        if text_area:
                            self.mobile_type(text_area, current_text, clear_first=False)
                            self.debug_log("✅ テキスト復元完了")
                    except Exception as e:
                        self.debug_log(f"❌ テキスト復元エラー: {e}", "ERROR")
                
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
            
            # テキスト入力前の状態をチェック
            self.debug_log("📝 テキスト入力開始前の状態チェック")
            self.check_text_content(step_name="テキスト入力開始前")
            
            # テキストを入力
            self.mobile_type(textarea, message, clear_first=False)
            
            # テキスト入力完了後の状態をチェック
            self.debug_log("📝 テキスト入力完了後の状態チェック")
            self.check_text_content(step_name="テキスト入力完了後")
            
            self.debug_log(f"✅ モバイルテキスト入力完了: {message[:50]}{'...' if len(message) > 50 else ''}")
            
            # 画像がある場合はアップロード
            if image_paths:
                self.debug_log(f"📷 画像アップロード開始: {len(image_paths)}枚")
                self.check_text_content(step_name="画像アップロード前")
                self.upload_images_mobile(image_paths, message)
                self.check_text_content(step_name="画像アップロード後")
            
            # テストモードの場合は実際の投稿をスキップ
            if test_mode:
                self.debug_log("🚫 実投稿モード: 投稿直前で停止（投稿処理はコメントアウト中）")
                self.debug_log("✅ モバイルテキスト入力完了")
                print("✅ === モバイル版投稿テスト成功！ ===")
                return True
            
            # 実際の投稿処理（テストモードでない場合のみ）
            self.debug_log("🚀 実投稿モード: 投稿ボタンを探します")
            
            post_button_selectors = [
                '[data-testid="tweetButtonInline"]',
                '[data-testid="tweetButton"]',
                'button[data-testid="tweetButton"]',
                '[role="button"][aria-label*="ツイート"], [role="button"][aria-label*="Tweet"]',
                'button:has-text("ツイート"), button:has-text("Tweet")'
            ]
            
            post_button = None
            for selector in post_button_selectors:
                try:
                    button = self.page.query_selector(selector)
                    if button and button.is_visible() and not button.is_disabled():
                        post_button = button
                        self.debug_log(f"投稿ボタン発見: {selector}")
                        break
                except:
                    continue
            
            if post_button:
                self.debug_log("🚀 モバイル実投稿実行中...")
                if self.mobile_tap(post_button):
                    self.human_delay(3000, 5000)  # 投稿完了を待機
                    self.debug_log("✅ === モバイル版投稿完了成功！ ===")
                    print("✅ === モバイル版投稿完了成功！ ===")
                    return True
                else:
                    self.debug_log("❌ 投稿ボタンクリック失敗", "ERROR")
                    return False
            else:
                self.debug_log("❌ 投稿ボタンが見つかりません", "ERROR")
                return False
                
        except Exception as e:
            error_msg = f"モバイルツイート投稿エラー: {e}"
            self.debug_log(error_msg, "ERROR")
            print(f"❌ モバイル版投稿エラー: {e}")
            return False

    def logout_twitter(self):
        """Twitterからログアウト"""
        try:
            self.debug_log("🚪 Twitterログアウト開始")
            
            # メニューボタンを探す（モバイル版）
            menu_selectors = [
                '[data-testid="DashButton_ProfileIcon_Link"]',  # プロフィールアイコン
                '[aria-label*="メニュー"], [aria-label*="Menu"]',
                '[data-testid="SideNav_AccountSwitcher_Button"]'
            ]
            
            menu_button = None
            for selector in menu_selectors:
                try:
                    button = self.page.query_selector(selector)
                    if button and button.is_visible():
                        menu_button = button
                        self.debug_log(f"メニューボタン発見: {selector}")
                        break
                except:
                    continue
            
            if menu_button:
                self.mobile_tap(menu_button)
                self.human_delay(1000, 2000)
                
                # ログアウトリンクを探す
                logout_selectors = [
                    'a[href="/logout"]',
                    '[data-testid="AccountSwitcher_Logout_Button"]',
                    '[role="menuitem"]:has-text("ログアウト"), [role="menuitem"]:has-text("Log out")'
                ]
                
                for selector in logout_selectors:
                    try:
                        logout_link = self.page.query_selector(selector)
                        if logout_link and logout_link.is_visible():
                            self.mobile_tap(logout_link)
                            self.human_delay(2000, 3000)
                            self.debug_log("✅ ログアウト実行完了")
                            return True
                    except:
                        continue
            
            self.debug_log("⚠️ ログアウトボタンが見つかりません", "WARNING")
            return False
            
        except Exception as e:
            self.debug_log(f"ログアウトエラー: {e}", "ERROR")
            return False

    def force_fresh_login(self):
        """強制的に新規ログインを要求"""
        try:
            self.debug_log("🔄 強制新規ログイン開始")
            
            # まずログアウトを試行
            self.logout_twitter()
            
            # プロファイルディレクトリをクリア（セッション情報削除）
            if os.path.exists(self.profile_dir):
                import shutil
                shutil.rmtree(self.profile_dir)
                self.debug_log(f"🗑️ プロファイルディレクトリクリア: {self.profile_dir}")
                os.makedirs(self.profile_dir, exist_ok=True)
            
            # ブラウザを再起動
            self.cleanup_mobile()
            time.sleep(2)
            
            # 新しいセッションで再起動
            if self.setup_mobile_browser():
                if self.navigate_to_mobile_twitter():
                    self.debug_log("✅ 強制新規ログイン準備完了")
                    return True
            
            return False
            
        except Exception as e:
            self.debug_log(f"強制新規ログインエラー: {e}", "ERROR")
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
        elif os.path.exists(arg):
            image_paths.append(arg)
        else:
            print(f"⚠️ ファイルが見つかりません: {arg}")
    
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