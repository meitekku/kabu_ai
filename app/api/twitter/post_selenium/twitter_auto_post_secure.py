# twitter_auto_post_secure.py
# 環境変数から認証情報を読み取るバージョン + 詳細エラーレポート機能 + 絵文字対応修正

import os
import json
import traceback
from dotenv import load_dotenv  # pip install python-dotenv

import argparse
import base64
import urllib.parse
import sys
import tempfile
import shutil

# .envファイルを読み込む（Next.jsの.env.localも読める）
load_dotenv('.env.local')

# 既存のインポート
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from datetime import datetime

# ========== エラーレポート機能 ==========
class ErrorReporter:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.success_steps = []
        self.final_result = False
        
    def add_error(self, step, message, exception=None):
        error_data = {
            'step': step,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'type': 'error'
        }
        if exception:
            error_data['exception'] = str(exception)
            error_data['traceback'] = traceback.format_exc()
        self.errors.append(error_data)
        
    def add_warning(self, step, message):
        warning_data = {
            'step': step,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'type': 'warning'
        }
        self.warnings.append(warning_data)
        
    def add_success(self, step, message):
        success_data = {
            'step': step,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'type': 'success'
        }
        self.success_steps.append(success_data)
        
    def set_final_result(self, success):
        self.final_result = success
        
    def output_json_report(self):
        """JSON形式でレポートを出力"""
        report = {
            'final_result': self.final_result,
            'timestamp': datetime.now().isoformat(),
            'errors': self.errors,
            'warnings': self.warnings,
            'success_steps': self.success_steps,
            'summary': {
                'total_errors': len(self.errors),
                'total_warnings': len(self.warnings),
                'total_success_steps': len(self.success_steps)
            }
        }
        
        # JSONレポートの開始と終了マーカーで囲む（パースしやすくするため）
        print("=== JSON_REPORT_START ===")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        print("=== JSON_REPORT_END ===")

# グローバルなエラーレポーター
error_reporter = ErrorReporter()

# ========== 環境変数から設定を読み込み ==========
TWITTER_USERNAME = os.getenv('TWITTER_USERNAME', 'default_username')
TWITTER_PASSWORD = os.getenv('TWITTER_PASSWORD', 'default_password')
DEFAULT_MESSAGE = "画像付き自動投稿テスト: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
DEFAULT_IMAGE_PATH = os.getenv('DEFAULT_IMAGE_PATH', 'test.png')

# 認証情報が設定されているか確認
if TWITTER_USERNAME == 'default_username' or TWITTER_PASSWORD == 'default_password':
    error_msg = "環境変数 TWITTER_USERNAME と TWITTER_PASSWORD を設定してください"
    error_reporter.add_error("environment_check", error_msg)
    print("⚠️ 警告: " + error_msg)
    print("例: export TWITTER_USERNAME='your_username'")
    print("例: export TWITTER_PASSWORD='your_password'")
    error_reporter.set_final_result(False)
    error_reporter.output_json_report()
    exit(1)

def decode_emoji_message(encoded_message):
    """Base64エンコードされたメッセージをデコード"""
    try:
        # Base64デコード
        decoded_bytes = base64.b64decode(encoded_message)
        # URL形式のエンコーディングを解除
        decoded_str = urllib.parse.unquote(decoded_bytes.decode('latin-1'))
        return decoded_str
    except Exception as e:
        print(f"メッセージのデコードエラー: {e}")
        return None

def set_text_with_javascript(driver, element, text):
    """JavaScriptを使用してテキストを設定（絵文字対応）"""
    try:
        script = """
        var element = arguments[0];
        var text = arguments[1];
        
        // フォーカスを設定
        element.focus();
        
        // 既存の内容をクリア
        element.innerHTML = '';
        element.textContent = '';
        
        // テキストを設定（改行対応）
        if (text.includes('\\n')) {
            // 改行がある場合はHTMLとして設定
            var lines = text.split('\\n');
            var htmlContent = lines.map(function(line) {
                return '<div>' + (line || '<br>') + '</div>';
            }).join('');
            element.innerHTML = htmlContent;
        } else {
            // 改行がない場合は単純にテキスト設定
            element.textContent = text;
        }
        
        // React/Vue.jsなどのフレームワーク用のイベントを発火
        var inputEvent = new Event('input', { bubbles: true, cancelable: true });
        element.dispatchEvent(inputEvent);
        
        var changeEvent = new Event('change', { bubbles: true, cancelable: true });
        element.dispatchEvent(changeEvent);
        
        // フォーカスアウト
        element.blur();
        element.focus();
        
        return true;
        """
        
        result = driver.execute_script(script, element, text)
        return result
        
    except Exception as e:
        print(f"JavaScript テキスト設定エラー: {e}")
        return False

def create_chrome_driver():
    """Chromeドライバーを直接起動"""
    try:
        print("Chromeを起動中...")
        error_reporter.add_success("driver_init", "Chrome起動プロセス開始")
        
        # Chromeオプションを設定
        options = Options()
        
        # ヘッドレスモード追加
        options.add_argument("--headless")
        
        # 自動化の痕跡を隠す設定
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-automation")
        options.add_argument("--no-first-run")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        
        # ユーザーエージェントを設定
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # 一時プロファイルディレクトリを安全に作成
        temp_dir = None
        try:
            # tempfileを使って安全な一時ディレクトリを作成
            temp_dir = tempfile.mkdtemp(prefix='chrome_twitter_profile_')
            print(f"一時プロファイルディレクトリを作成: {temp_dir}")
            error_reporter.add_success("driver_init", f"一時プロファイルディレクトリ作成: {temp_dir}")
        except Exception as e:
            # フォールバック: 手動でディレクトリを作成
            if os.name == 'nt':  # Windows
                temp_base = os.environ.get('TEMP', 'C:\\Temp')
            else:  # macOS/Linux
                temp_base = '/tmp'
            
            temp_dir = os.path.join(temp_base, f'chrome_twitter_profile_{os.getpid()}')
            
            try:
                os.makedirs(temp_dir, exist_ok=True)
                print(f"フォールバック: 一時プロファイルディレクトリを作成: {temp_dir}")
                error_reporter.add_success("driver_init", f"フォールバック一時ディレクトリ作成: {temp_dir}")
            except Exception as mkdir_error:
                error_msg = f"一時ディレクトリの作成に失敗: {mkdir_error}"
                print(f"❌ {error_msg}")
                error_reporter.add_error("driver_init", error_msg, mkdir_error)
                return None
        
        options.add_argument(f"--user-data-dir={temp_dir}")
        
        # WebDriverManagerでChromeDriverを自動管理
        try:
            service = Service(ChromeDriverManager().install())
        except Exception as e:
            error_msg = f"ChromeDriverのダウンロードに失敗: {e}"
            print(f"❌ {error_msg}")
            error_reporter.add_error("driver_init", error_msg, e)
            # 一時ディレクトリをクリーンアップ
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            return None
        
        # Chromeドライバーを起動
        try:
            driver = webdriver.Chrome(service=service, options=options)
            driver.implicitly_wait(10)
            driver.set_window_size(1200, 800)
            
            # WebDriver検出回避の追加設定
            driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                "userAgent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            print("Chrome起動完了！")
            error_reporter.add_success("driver_init", "Chrome起動完了")
            
            # 一時ディレクトリのパスをドライバーオブジェクトに保存（後でクリーンアップ用）
            driver.temp_profile_dir = temp_dir
            
            return driver
            
        except Exception as e:
            error_msg = f"Chromeの起動に失敗: {e}"
            print(f"❌ {error_msg}")
            error_reporter.add_error("driver_init", error_msg, e)
            # 一時ディレクトリをクリーンアップ
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            return None
        
    except Exception as e:
        error_msg = f"Chromeの起動に失敗: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("driver_init", error_msg, e)
        return None


def check_login_status(driver):
    """ログイン状態をチェックする"""
    try:
        print("ログイン状態をチェック中...")
        error_reporter.add_success("login_check", "ログイン状態チェック開始")
        
        # ホームページにアクセス
        driver.get("https://twitter.com/home")
        time.sleep(3)
        
        # ログイン済みかどうかを判定する要素をチェック
        try:
            # アカウント切り替えボタンが存在するかチェック（ログイン済みの場合のみ表示）
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="SideNav_AccountSwitcher_Button"]'))
            )
            print("✅ 既にログイン済みです")
            error_reporter.add_success("login_check", "既にログイン済み（アカウント切り替えボタン確認）")
            return True
            
        except:
            # ツイート入力エリアが存在するかチェック（別の判定方法）
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
                )
                print("✅ 既にログイン済みです（ツイートエリア確認）")
                error_reporter.add_success("login_check", "既にログイン済み（ツイートエリア確認）")
                return True
            except:
                pass
        
        # 現在のURLをチェック（ログインページにリダイレクトされていないか）
        current_url = driver.current_url
        if "login" in current_url or "i/flow/login" in current_url:
            print("❌ ログインが必要です")
            error_reporter.add_warning("login_check", f"ログインページにリダイレクトされました: {current_url}")
            return False
        
        # ログインを促すメッセージが表示されているかチェック
        try:
            # "ログイン"ボタンや"サインイン"リンクの存在をチェック
            login_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'ログイン') or contains(text(), 'Log in') or contains(text(), 'Sign in')]")
            if login_elements:
                print("❌ ログインが必要です（ログインボタン検出）")
                error_reporter.add_warning("login_check", "ログインボタンが検出されました")
                return False
        except:
            pass
        
        print("⚠️ ログイン状態が不明です - ログインを試行します")
        error_reporter.add_warning("login_check", "ログイン状態が不明 - ログインを試行")
        return False
        
    except Exception as e:
        error_msg = f"ログイン状態チェックエラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("login_check", error_msg, e)
        print("ログインを試行します")
        return False


def twitter_login(driver, username=TWITTER_USERNAME, password=TWITTER_PASSWORD):
    """Twitterにログイン"""
    try:
        print(f"Twitterログインページへアクセス... (ユーザー: {username})")
        error_reporter.add_success("login", f"ログインプロセス開始 (ユーザー: {username})")
        
        driver.get("https://twitter.com/login")
        time.sleep(3)
        
        # ユーザー名入力
        print("ユーザー名を入力...")
        try:
            username_input = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
            )
            username_input.clear()
            username_input.send_keys(username)
            username_input.send_keys(Keys.RETURN)
            time.sleep(2)
            error_reporter.add_success("login", "ユーザー名入力完了")
        except Exception as e:
            error_msg = f"ユーザー名入力エラー: {e}"
            error_reporter.add_error("login", error_msg, e)
            return False
        
        # 電話番号/メール確認画面が出る場合の対処
        try:
            phone_input = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[data-testid="ocfEnterTextTextInput"]'))
            )
            error_msg = "電話番号/メール確認が必要です。手動で入力してください..."
            print(f"❌ {error_msg}")
            error_reporter.add_error("login", error_msg)
            return False  # 自動化できない場合はFalseを返す
        except:
            pass  # 確認不要の場合はスキップ
        
        # パスワード入力
        print("パスワードを入力...")
        try:
            password_input = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"]'))
            )
            password_input.clear()
            password_input.send_keys(password)
            password_input.send_keys(Keys.RETURN)
            time.sleep(5)
            error_reporter.add_success("login", "パスワード入力完了")
        except Exception as e:
            error_msg = f"パスワード入力エラー: {e}"
            error_reporter.add_error("login", error_msg, e)
            return False
        
        # ログイン成功確認
        print("ログイン確認中...")
        try:
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="SideNav_AccountSwitcher_Button"]'))
            )
            print("✅ ログイン成功！")
            error_reporter.add_success("login", "ログイン成功確認")
            return True
        except Exception as e:
            error_msg = f"ログイン成功確認エラー: {e}"
            error_reporter.add_error("login", error_msg, e)
            return False
        
    except Exception as e:
        error_msg = f"ログインエラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("login", error_msg, e)
        return False


def post_tweet_with_image(driver, message=DEFAULT_MESSAGE, image_path=DEFAULT_IMAGE_PATH):
    """画像付きツイートを投稿（絵文字対応版）"""
    try:
        print(f"画像付きツイート投稿中...")
        print(f"  メッセージ: {message}")
        print(f"  画像パス: {image_path}")
        error_reporter.add_success("tweet_with_image", f"画像付きツイート開始 - メッセージ: {message}, 画像: {image_path}")
        
        # 画像ファイルの存在確認
        if not os.path.exists(image_path):
            error_msg = f"画像ファイルが見つかりません: {image_path}"
            print(f"❌ {error_msg}")
            error_reporter.add_error("tweet_with_image", error_msg)
            return False
        
        # 画像の絶対パスを取得
        abs_image_path = os.path.abspath(image_path)
        print(f"  絶対パス: {abs_image_path}")
        error_reporter.add_success("tweet_with_image", f"画像ファイル確認完了: {abs_image_path}")
        
        # ホームページへ移動
        print("ホームページへ移動...")
        driver.get("https://twitter.com/home")
        time.sleep(3)
        error_reporter.add_success("tweet_with_image", "ホームページアクセス完了")
        
        # ツイート入力エリアをクリック
        print("入力エリアを探しています...")
        try:
            tweet_textarea = WebDriverWait(driver, 20).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            tweet_textarea.click()
            time.sleep(1)
            error_reporter.add_success("tweet_with_image", "ツイート入力エリア発見・クリック完了")
        except Exception as e:
            error_msg = f"ツイート入力エリアが見つかりません: {e}"
            error_reporter.add_error("tweet_with_image", error_msg, e)
            return False
        
        # テキスト入力（JavaScriptを使用して絵文字対応）
        print("メッセージを入力中（JavaScript使用）...")
        try:
            success = set_text_with_javascript(driver, tweet_textarea, message)
            if success:
                time.sleep(2)
                error_reporter.add_success("tweet_with_image", "メッセージ入力完了（JavaScript）")
                print("✅ メッセージ入力完了（絵文字対応）")
            else:
                # フォールバック: 通常のsend_keysを試行
                print("⚠️ JavaScript入力に失敗、通常入力を試行...")
                tweet_textarea.clear()
                tweet_textarea.send_keys(message)
                time.sleep(2)
                error_reporter.add_warning("tweet_with_image", "フォールバック: 通常入力を使用")
                print("✅ メッセージ入力完了（通常入力）")
        except Exception as e:
            error_msg = f"メッセージ入力エラー: {e}"
            error_reporter.add_error("tweet_with_image", error_msg, e)
            return False
        
        # 画像アップロードボタンを探してクリック
        print("画像アップロードボタンを探しています...")
        try:
            # 直接ファイル入力要素を探す（これが確実に動作している）
            print("ファイル入力要素を検索中...")
            file_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="file"][accept*="image"]'))
            )
            print("✅ ファイル入力要素を発見！")
            error_reporter.add_success("tweet_with_image", "ファイル入力要素発見")
            
            # ファイルパスを送信
            print("画像ファイルをアップロード中...")
            file_input.send_keys(abs_image_path)
            print("ファイルパス送信完了、アップロード処理待機中...")
            time.sleep(3)
            error_reporter.add_success("tweet_with_image", "画像ファイルアップロード送信完了")
            
            # アップロード完了確認：ファイル入力要素の状態をチェック
            print("アップロード完了を確認中...")
            upload_success = False
            
            # 方法1: ファイル入力要素のvalue属性をチェック
            try:
                file_value = file_input.get_attribute('value')
                if file_value:
                    print(f"✅ ファイル入力要素にファイルが設定されています: {file_value}")
                    upload_success = True
                    error_reporter.add_success("tweet_with_image", f"ファイル設定確認: {file_value}")
            except:
                pass
            
            # 方法2: 簡単なセレクターでメディア要素をチェック
            if not upload_success:
                simple_selectors = [
                    '[data-testid="media"]',
                    'img[src*="blob:"]',
                    '[data-testid="removeMedia"]'
                ]
                
                for selector in simple_selectors:
                    try:
                        WebDriverWait(driver, 5).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                        )
                        print(f"✅ 画像アップロード完了確認（{selector}）")
                        upload_success = True
                        error_reporter.add_success("tweet_with_image", f"アップロード確認: {selector}")
                        break
                    except:
                        continue
            
            # 方法3: 少し待ってツイートエリア内の変化をチェック
            if not upload_success:
                try:
                    time.sleep(2)
                    # ツイートエリア内にimg要素があるかチェック
                    tweet_container = driver.find_element(By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]').find_element(By.XPATH, './ancestor::form | ./ancestor::div[@role="dialog"] | ./ancestor::div[contains(@class, "css-")]')
                    images = tweet_container.find_elements(By.TAG_NAME, 'img')
                    if len(images) > 0:
                        print(f"✅ ツイートエリア内に画像を確認（{len(images)}個）")
                        upload_success = True
                        error_reporter.add_success("tweet_with_image", f"ツイートエリア内画像確認: {len(images)}個")
                except Exception as e:
                    error_reporter.add_warning("tweet_with_image", f"コンテナチェックエラー: {e}")
            
            if upload_success:
                print("🎉 画像アップロード完了！")
                error_reporter.add_success("tweet_with_image", "画像アップロード完了")
            else:
                warning_msg = "アップロード完了の確認ができませんでしたが、ファイルは送信済みです"
                print(f"⚠️ {warning_msg}")
                error_reporter.add_warning("tweet_with_image", warning_msg)
            
        except Exception as e:
            error_msg = f"画像アップロードエラー: {e}"
            print(f"❌ {error_msg}")
            error_reporter.add_error("tweet_with_image", error_msg, e)
            print("テキストのみで投稿を続行します...")
        
        time.sleep(2)
        
        # 投稿ボタンをクリック
        print("投稿ボタンをクリック...")
        try:
            post_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetButtonInline"]'))
            )
            post_button.click()
            time.sleep(5)
            error_reporter.add_success("tweet_with_image", "投稿ボタンクリック完了")
        except Exception as e:
            error_msg = f"投稿ボタンクリックエラー: {e}"
            error_reporter.add_error("tweet_with_image", error_msg, e)
            return False
        
        # 投稿完了確認（ホームタイムラインに戻っているかチェック）
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            success_msg = f"ツイート投稿完了！時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, 内容: {message}, 画像: {image_path}"
            print(f"✅ {success_msg}")
            error_reporter.add_success("tweet_with_image", success_msg)
            return True
        except:
            warning_msg = "投稿完了の確認ができませんでしたが、投稿ボタンはクリックしました"
            print(f"⚠️ {warning_msg}")
            error_reporter.add_warning("tweet_with_image", warning_msg)
            return True  # ボタンクリック成功で成功とみなす
        
    except Exception as e:
        error_msg = f"投稿エラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("tweet_with_image", error_msg, e)
        return False


def post_tweet(driver, message=DEFAULT_MESSAGE):
    """テキストのみのツイートを投稿（絵文字対応版）"""
    try:
        print(f"ツイート投稿中: {message}")
        error_reporter.add_success("tweet_text_only", f"テキストツイート開始: {message}")
        
        # ホームページへ移動
        print("ホームページへ移動...")
        driver.get("https://twitter.com/home")
        time.sleep(3)
        error_reporter.add_success("tweet_text_only", "ホームページアクセス完了")
        
        # ツイート入力エリアをクリック
        print("入力エリアを探しています...")
        try:
            tweet_textarea = WebDriverWait(driver, 20).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            tweet_textarea.click()
            time.sleep(1)
            error_reporter.add_success("tweet_text_only", "ツイート入力エリア発見・クリック完了")
        except Exception as e:
            error_msg = f"ツイート入力エリアが見つかりません: {e}"
            error_reporter.add_error("tweet_text_only", error_msg, e)
            return False
        
        # テキスト入力（JavaScriptを使用して絵文字対応）
        print("メッセージを入力中（JavaScript使用）...")
        try:
            success = set_text_with_javascript(driver, tweet_textarea, message)
            if success:
                time.sleep(2)
                error_reporter.add_success("tweet_text_only", "メッセージ入力完了（JavaScript）")
                print("✅ メッセージ入力完了（絵文字対応）")
            else:
                # フォールバック: 通常のsend_keysを試行
                print("⚠️ JavaScript入力に失敗、通常入力を試行...")
                tweet_textarea.clear()
                tweet_textarea.send_keys(message)
                time.sleep(2)
                error_reporter.add_warning("tweet_text_only", "フォールバック: 通常入力を使用")
                print("✅ メッセージ入力完了（通常入力）")
        except Exception as e:
            error_msg = f"メッセージ入力エラー: {e}"
            error_reporter.add_error("tweet_text_only", error_msg, e)
            return False
        
        # 投稿ボタンをクリック
        print("投稿ボタンをクリック...")
        try:
            post_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetButtonInline"]'))
            )
            post_button.click()
            time.sleep(3)
            error_reporter.add_success("tweet_text_only", "投稿ボタンクリック完了")
        except Exception as e:
            error_msg = f"投稿ボタンクリックエラー: {e}"
            error_reporter.add_error("tweet_text_only", error_msg, e)
            return False
        
        # 投稿完了確認（ホームタイムラインに戻っているかチェック）
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            success_msg = f"ツイート投稿完了！時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}, 内容: {message}"
            print(f"✅ {success_msg}")
            error_reporter.add_success("tweet_text_only", success_msg)
            return True
        except:
            warning_msg = "投稿完了の確認ができませんでしたが、投稿ボタンはクリックしました"
            print(f"⚠️ {warning_msg}")
            error_reporter.add_warning("tweet_text_only", warning_msg)
            return True  # ボタンクリック成功で成功とみなす
        
    except Exception as e:
        error_msg = f"投稿エラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("tweet_text_only", error_msg, e)
        return False


def run_main(message=None, image_path=None, text_only=False):
    """メイン処理 - 成功時True、失敗時Falseを返す"""
    driver = None
    temp_dir = None
    try:
        error_reporter.add_success("main", "メイン処理開始")
        
        # メッセージが指定されていない場合はデフォルトを使用
        if message is None:
            message = DEFAULT_MESSAGE
        
        # 画像パスが指定されていない場合はデフォルトを使用
        if image_path is None:
            image_path = DEFAULT_IMAGE_PATH
        
        # Chromeを直接起動
        driver = create_chrome_driver()
        if not driver:
            error_msg = "Chromeの起動に失敗しました"
            print(f"❌ {error_msg}")
            error_reporter.add_error("main", error_msg)
            error_reporter.set_final_result(False)
            return False
        
        # ドライバーから一時ディレクトリのパスを取得
        if hasattr(driver, 'temp_profile_dir'):
            temp_dir = driver.temp_profile_dir
        
        # まずログイン状態をチェック
        is_logged_in = check_login_status(driver)
        
        # ログインが必要な場合のみログイン処理を実行
        if not is_logged_in:
            print("ログインが必要です。ログイン処理を開始します...")
            is_logged_in = twitter_login(driver)
        
        # ログイン済み（または新規ログイン成功）の場合、ツイート投稿
        if is_logged_in:
            if text_only:
                success = post_tweet(driver, message)
            else:
                success = post_tweet_with_image(driver, message, image_path)
            
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
        # ブラウザを閉じる（必要に応じてコメントアウト）
        if driver:
            try:
                driver.quit()
                print("ブラウザを閉じました")
                error_reporter.add_success("cleanup", "ブラウザクリーンアップ完了")
            except Exception as e:
                error_reporter.add_warning("cleanup", f"ブラウザクリーンアップエラー: {e}")
        
        # 一時プロファイルディレクトリをクリーンアップ
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
                print(f"一時プロファイルディレクトリを削除: {temp_dir}")
                error_reporter.add_success("cleanup", f"一時ディレクトリ削除: {temp_dir}")
            except Exception as e:
                error_reporter.add_warning("cleanup", f"一時ディレクトリ削除エラー: {e}")


# 簡単に使える関数
def quick_tweet(message=None):
    """簡単にテキストツイートを投稿する関数 - 成功時True、失敗時Falseを返す"""
    return run_main(message, text_only=True)


def quick_image_tweet(message=None, image_path=None):
    """簡単に画像付きツイートを投稿する関数 - 成功時True、失敗時Falseを返す"""
    return run_main(message, image_path)


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
    print("自動判定（推奨）:")
    print("  python script.py \"テキストメッセージ\"")
    print("  python script.py \"path/to/image.jpg\" \"メッセージ\"")
    print("  python script.py \"path/to/image.jpg\"")
    print("  → 第1引数が画像ファイルかどうかで自動判定")
    print()
    print("ヘルプ:")
    print("  python script.py --help")
    print("==========================================\n")

def main():
    parser = argparse.ArgumentParser(description='Twitter自動投稿スクリプト')
    parser.add_argument('message', nargs='?', help='投稿するメッセージ')
    parser.add_argument('--encoded-message', help='Base64エンコードされたメッセージ')
    parser.add_argument('--image', help='画像ファイルのパス')
    parser.add_argument('--text-only', action='store_true', help='テキストのみの投稿')
    
    args = parser.parse_args()
    
    # メッセージの処理
    message = None
    if args.encoded_message:
        # エンコードされたメッセージをデコード
        message = decode_emoji_message(args.encoded_message)
        if not message:
            error_reporter.add_error("argument_parse", "エンコードされたメッセージのデコードに失敗しました")
            error_reporter.set_final_result(False)
            error_reporter.output_json_report()
            sys.exit(1)
        print(f"📝 エンコードされたメッセージをデコードしました")
    else:
        message = args.message
    
    # 画像パスの処理
    image_path = args.image
    
    try:
        # メイン処理を実行
        success = run_main(message, image_path, args.text_only)
        
        # JSONレポートを出力
        error_reporter.output_json_report()
        
        # 終了コードを設定
        sys.exit(0 if success else 1)
        
    except Exception as e:
        error_reporter.add_error("main", f"メイン処理で予期しないエラー: {e}", e)
        error_reporter.set_final_result(False)
        error_reporter.output_json_report()
        sys.exit(1)

if __name__ == "__main__":
    main()