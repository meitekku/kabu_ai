# twitter_auto_post_secure.py
# 環境変数から認証情報を読み取るバージョン + 詳細エラーレポート機能 + 絵文字対応 + テキスト入力修正版（コピペ動作対応）

import os
import json
import traceback
import base64
import urllib.parse
import subprocess
import signal
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("⚠️ psutil がインストールされていません。'pip install psutil' でインストールしてください。")
    print("   ChromeDriverプロセスの自動終了機能が制限されます。")

from dotenv import load_dotenv  # pip install python-dotenv

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
def get_twitter_credentials():
    """環境に応じてTwitter認証情報を取得"""
    import socket
    try:
        hostname = socket.gethostname()
        # localhost環境の判定
        is_localhost = (
            "localhost" in hostname.lower() or 
            hostname.lower() in ["localhost", "127.0.0.1"] or
            os.getenv("NODE_ENV") == "development" or
            os.getenv("ENVIRONMENT") == "development" or
            os.getenv("ENVIRONMENT") == "local" or
            os.getenv("TWITTER_TEST_MODE") == "true" or
            os.getenv("DEV_MODE") == "true" or
            os.getenv("TWITTER_LIMIT_CHARS") == "true"
        )
        
        if is_localhost:
            # localhost環境: 環境変数から取得
            username = os.getenv('TWITTER_USERNAME', 'default_username')
            password = os.getenv('TWITTER_PASSWORD', 'default_password')
            print(f"📝 localhost環境: 環境変数から認証情報を取得")
        else:
            # 本番環境: 固定の認証情報
            username = 'smartaiinvest@gmail.com'
            password = 'sarukiki1'
            print(f"📝 本番環境: 固定認証情報を使用")
            
        return username, password
    except Exception as e:
        print(f"認証情報取得エラー: {e}")
        # フォールバック: 環境変数から取得
        return os.getenv('TWITTER_USERNAME', 'default_username'), os.getenv('TWITTER_PASSWORD', 'default_password')

TWITTER_USERNAME, TWITTER_PASSWORD = get_twitter_credentials()
DEFAULT_MESSAGE = "画像付き自動投稿テスト: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
DEFAULT_IMAGE_PATH = os.getenv('DEFAULT_IMAGE_PATH', 'test.png')

# 認証情報が設定されているか確認（localhost環境のみ）
import socket
try:
    hostname = socket.gethostname()
    is_localhost = (
        "localhost" in hostname.lower() or 
        hostname.lower() in ["localhost", "127.0.0.1"] or
        os.getenv("NODE_ENV") == "development" or
        os.getenv("ENVIRONMENT") == "development" or
        os.getenv("ENVIRONMENT") == "local" or
        os.getenv("TWITTER_TEST_MODE") == "true" or
        os.getenv("DEV_MODE") == "true" or
        os.getenv("TWITTER_LIMIT_CHARS") == "true"
    )
    
    # localhost環境でのみ環境変数チェック
    if is_localhost and (TWITTER_USERNAME == 'default_username' or TWITTER_PASSWORD == 'default_password'):
        error_msg = "localhost環境では環境変数 TWITTER_USERNAME と TWITTER_PASSWORD を設定してください"
        error_reporter.add_error("environment_check", error_msg)
        print("⚠️ 警告: " + error_msg)
        print("例: export TWITTER_USERNAME='your_username'")
        print("例: export TWITTER_PASSWORD='your_password'")
        error_reporter.set_final_result(False)
        error_reporter.output_json_report()
        exit(1)
    else:
        print(f"✅ 認証情報確認完了: {TWITTER_USERNAME}")
        
except Exception as e:
    print(f"環境判定エラー: {e}")
    # エラー時は localhost として扱う
    if TWITTER_USERNAME == 'default_username' or TWITTER_PASSWORD == 'default_password':
        error_msg = "環境変数 TWITTER_USERNAME と TWITTER_PASSWORD を設定してください"
        error_reporter.add_error("environment_check", error_msg)
        print("⚠️ 警告: " + error_msg)
        error_reporter.set_final_result(False)
        error_reporter.output_json_report()
        exit(1)

def decode_emoji_message(encoded_message):
    """Base64エンコードされたメッセージをデコード（修正版）"""
    try:
        # Base64デコード
        decoded_bytes = base64.b64decode(encoded_message)
        # UTF-8でデコード（日本語と絵文字に対応）
        decoded_str = decoded_bytes.decode('utf-8')
        return decoded_str
    except Exception as e:
        # UTF-8でエラーが出た場合、URL形式のデコードを試みる
        try:
            decoded_bytes = base64.b64decode(encoded_message)
            # URLエンコードされている可能性があるので、まずバイト列として取得
            url_encoded_str = decoded_bytes.decode('ascii')
            # URLデコード
            decoded_str = urllib.parse.unquote(url_encoded_str)
            return decoded_str
        except Exception as e2:
            print(f"メッセージのデコードエラー: {e}, {e2}")
            error_reporter.add_error("decode_message", f"デコードエラー: {e}, {e2}", e)
            return None

def kill_all_chromedrivers():
    """すべてのChromeDriverプロセスを強制終了（緊急時・エラー時専用）"""
    try:
        print("ChromeDriverプロセスをクリーンアップ中...")
        killed_count = 0
        
        # psutilが利用可能な場合の詳細検索
        if PSUTIL_AVAILABLE:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    proc_name = proc.info['name'].lower()
                    cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                    
                    # ChromeDriverプロセスを特定
                    if ('chromedriver' in proc_name or 
                        'chromedriver' in cmdline.lower() or
                        (proc_name == 'chrome' and '--test-type' in cmdline)):
                        
                        print(f"ChromeDriverプロセス終了: PID={proc.info['pid']}, 名前={proc_name}")
                        proc.kill()
                        killed_count += 1
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
        
        # コマンドラインでも確実に終了（psutil有無に関わらず実行）
        if os.name == 'nt':  # Windows
            try:
                result = subprocess.run(['taskkill', '/F', '/IM', 'chromedriver.exe'], 
                                     capture_output=True, text=True)
                if result.returncode == 0:
                    print("WindowsでChromeDriverプロセスを終了しました")
            except Exception as e:
                print(f"Windows taskkill エラー: {e}")
        else:  # macOS/Linux
            try:
                result = subprocess.run(['pkill', '-f', 'chromedriver'], 
                                     capture_output=True, text=True)
                if result.returncode == 0:
                    print("macOS/LinuxでChromeDriverプロセスを終了しました")
            except Exception as e:
                print(f"macOS/Linux pkill エラー: {e}")
        
        print(f"緊急ChromeDriverプロセスクリーンアップ完了: {killed_count}個のプロセスを終了")
        error_reporter.add_warning("cleanup", f"緊急時ChromeDriverプロセス終了: {killed_count}個")
        
    except Exception as e:
        error_msg = f"ChromeDriverクリーンアップエラー: {e}"
        print(f"⚠️ {error_msg}")
        error_reporter.add_warning("cleanup", error_msg)


def create_chrome_driver():
    """Chromeドライバーを直接起動（個別プロセス管理）"""
    driver = None
    try:
        print("Chromeを起動中（並行実行対応）...")
        error_reporter.add_success("driver_init", "Chrome起動プロセス開始")
        
        # Chromeオプションを設定
        options = Options()
        
        # ヘッドレスモード追加（必要に応じてコメントアウト）
        # options.add_argument("--headless")
        
        # 自動化の痕跡を隠す設定
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-automation")
        options.add_argument("--no-first-run")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        
        # 文字化け対策：言語設定を追加
        options.add_argument("--lang=ja")
        
        # ユーザーエージェントを設定
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # 一時プロファイルディレクトリを設定（ユニークなディレクトリ名 + ポート）
        import uuid
        import random
        unique_id = str(uuid.uuid4())[:8]
        
        # ランダムなリモートデバッグポートを設定（並行実行対応）
        debug_port = random.randint(9222, 9322)
        options.add_argument(f"--remote-debugging-port={debug_port}")
        
        if os.name == 'nt':  # Windows
            temp_dir = os.path.join(os.environ.get('TEMP'), f'chrome_twitter_profile_{unique_id}_{debug_port}')
        else:  # macOS/Linux
            temp_dir = os.path.join('/tmp', f'chrome_twitter_profile_{unique_id}_{debug_port}')
        
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        options.add_argument(f"--user-data-dir={temp_dir}")
        
        print(f"Chrome設定: プロファイル={temp_dir}, デバッグポート={debug_port}")
        
        # セッション競合を避けるための追加オプション（並行実行対応）
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-backgrounding-occluded-windows")
        options.add_argument("--disable-renderer-backgrounding")
        options.add_argument("--disable-features=TranslateUI")
        options.add_argument("--disable-ipc-flooding-protection")
        
        # 並行実行でのプロセス独立性を高める設定
        options.add_argument("--disable-shared-memory")
        options.add_argument("--disable-single-process")
        options.add_argument("--process-per-site")
        options.add_argument(f"--force-device-scale-factor=1")
        
        # WebDriverManagerでChromeDriverを自動管理
        service = Service(ChromeDriverManager().install())
        
        # Chromeドライバーを起動
        driver = webdriver.Chrome(service=service, options=options)
        driver.implicitly_wait(3)
        driver.set_window_size(1200, 800)
        
        # ドライバー固有の情報を保存（エラー時のクリーンアップ用）
        driver._unique_id = unique_id
        driver._debug_port = debug_port
        driver._temp_dir = temp_dir
        
        # WebDriver検出回避の追加設定
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print(f"Chrome起動完了！ID: {unique_id}, ポート: {debug_port}")
        error_reporter.add_success("driver_init", f"Chrome起動完了 (ID: {unique_id}, ポート: {debug_port})")
        return driver
        
    except Exception as e:
        error_msg = f"Chromeの起動に失敗: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("driver_init", error_msg, e)
        # 失敗時は作成されたドライバーのみクリーンアップ
        if driver:
            try:
                cleanup_specific_driver(driver)
            except:
                pass
        return None


def cleanup_specific_driver(driver):
    """特定のドライバーとその関連プロセスをクリーンアップ"""
    try:
        if hasattr(driver, '_unique_id'):
            print(f"ドライバー個別クリーンアップ開始: ID={driver._unique_id}")
            
            # ドライバーを閉じる
            try:
                driver.quit()
                print(f"ドライバー終了完了: ID={driver._unique_id}")
            except:
                pass
            
            # 一時ディレクトリを削除
            if hasattr(driver, '_temp_dir') and os.path.exists(driver._temp_dir):
                try:
                    import shutil
                    shutil.rmtree(driver._temp_dir)
                    print(f"一時ディレクトリ削除: {driver._temp_dir}")
                except Exception as e:
                    print(f"一時ディレクトリ削除失敗: {e}")
            
            # 特定のポートのプロセスを終了
            if hasattr(driver, '_debug_port'):
                try:
                    if PSUTIL_AVAILABLE:
                        for proc in psutil.process_iter(['pid', 'name', 'connections']):
                            try:
                                for conn in proc.info['connections'] or []:
                                    if conn.laddr.port == driver._debug_port:
                                        print(f"ポート{driver._debug_port}使用プロセス終了: PID={proc.pid}")
                                        proc.kill()
                                        break
                            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                                continue
                except Exception as e:
                    print(f"ポート特定プロセス終了失敗: {e}")
                    
            print(f"個別クリーンアップ完了: ID={driver._unique_id}")
        else:
            # fallback: 通常のドライバー終了
            try:
                driver.quit()
            except:
                pass
                
    except Exception as e:
        print(f"個別クリーンアップエラー: {e}")
        # 最後の手段として通常終了を試行
        try:
            driver.quit()
        except:
            pass


def check_login_status(driver):
    """ログイン状態をチェックする"""
    try:
        print("ログイン状態をチェック中...")
        error_reporter.add_success("login_check", "ログイン状態チェック開始")
        
        # ホームページにアクセス
        driver.get("https://twitter.com/home")
        time.sleep(1)
        
        # ログイン済みかどうかを判定する要素をチェック
        try:
            # アカウント切り替えボタンが存在するかチェック（ログイン済みの場合のみ表示）
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="SideNav_AccountSwitcher_Button"]'))
            )
            print("✅ 既にログイン済みです")
            error_reporter.add_success("login_check", "既にログイン済み（アカウント切り替えボタン確認）")
            return True
            
        except:
            # ツイート入力エリアが存在するかチェック（別の判定方法）
            try:
                WebDriverWait(driver, 3).until(
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
        time.sleep(1)
        
        # ユーザー名入力
        print("ユーザー名を入力...")
        try:
            username_input = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
            )
            username_input.clear()
            username_input.send_keys(username)
            username_input.send_keys(Keys.RETURN)
            time.sleep(0.3)
            error_reporter.add_success("login", "ユーザー名入力完了")
        except Exception as e:
            error_msg = f"ユーザー名入力エラー: {e}"
            error_reporter.add_error("login", error_msg, e)
            return False
        
        # 電話番号/メール確認画面が出る場合の対処
        try:
            phone_input = WebDriverWait(driver, 1).until(
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
            password_input = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[type="password"]'))
            )
            password_input.clear()
            password_input.send_keys(password)
            password_input.send_keys(Keys.RETURN)
            time.sleep(0.5)
            error_reporter.add_success("login", "パスワード入力完了")
        except Exception as e:
            error_msg = f"パスワード入力エラー: {e}"
            error_reporter.add_error("login", error_msg, e)
            return False
        
        # ログイン成功確認
        print("ログイン確認中...")
        try:
            WebDriverWait(driver, 5).until(
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


def find_tweet_button(driver):
    """投稿ボタンを複数の方法で探す"""
    # 複数のセレクタを試す
    selectors = [
        '[data-testid="tweetButtonInline"]',
        '[data-testid="tweetButton"]',
        'button[data-testid*="tweet"]',
        'div[role="button"][tabindex="0"] span:contains("Post")',
        'div[role="button"][tabindex="0"] span:contains("ポスト")',
        'div[dir="ltr"] > span > span:contains("Post")',
        'div[dir="ltr"] > span > span:contains("ポスト")'
    ]
    
    for selector in selectors:
        try:
            # CSSセレクタを試す
            if ':contains' not in selector:
                button = driver.find_element(By.CSS_SELECTOR, selector)
                if button and button.is_displayed() and button.is_enabled():
                    print(f"✅ 投稿ボタン発見: {selector}")
                    return button
        except:
            pass
    
    # XPathでも試す
    xpath_selectors = [
        "//div[@role='button']//span[text()='Post']",
        "//div[@role='button']//span[text()='ポスト']",
        "//button[contains(@data-testid, 'tweet')]",
        "//div[@role='button' and @tabindex='0']//span[contains(text(), 'Post')]",
        "//div[@role='button' and @tabindex='0']//span[contains(text(), 'ポスト')]"
    ]
    
    for xpath in xpath_selectors:
        try:
            button = driver.find_element(By.XPATH, xpath)
            if button and button.is_displayed() and button.is_enabled():
                print(f"✅ 投稿ボタン発見(XPath): {xpath}")
                return button
        except:
            pass
    
    # 最後の手段：JavaScriptで探す
    try:
        script = """
        // 「Post」または「ポスト」というテキストを含むボタンを探す
        var buttons = document.querySelectorAll('div[role="button"], button');
        for (var btn of buttons) {
            var text = btn.textContent || btn.innerText || '';
            if (text === 'Post' || text === 'ポスト' || text.includes('Post') || text.includes('ポスト')) {
                // ボタンが表示されていて、有効であることを確認
                var rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && btn.offsetParent !== null) {
                    return btn;
                }
            }
        }
        return null;
        """
        button = driver.execute_script(script)
        if button:
            print("✅ 投稿ボタン発見(JavaScript)")
            return button
    except:
        pass
    
    return None


# ========== 改良版テキスト入力機能 ==========

def input_text_with_clipboard(driver, element, text):
    """コピペ動作でテキストを確実に入力する（改良版）"""
    try:
        print(f"クリップボード経由でテキスト入力: {text[:50]}...")
        
        # 要素をクリックしてフォーカス
        element.click()
        time.sleep(0.2)
        
        # 既存のテキストをクリア
        try:
            # Ctrl+A で全選択してからDelete
            if os.name == 'nt':  # Windows
                element.send_keys(Keys.CONTROL + 'a')
            else:  # Mac/Linux
                element.send_keys(Keys.COMMAND + 'a')
            time.sleep(0.1)
            element.send_keys(Keys.DELETE)
            time.sleep(0.1)
        except:
            pass
        
        # 方法1: document.execCommand を使用した確実なコピー操作
        try:
            print("方法1: document.execCommand でクリップボード操作")
            script = """
            // 隠しテキストエリアを作成
            var tempTextArea = document.createElement('textarea');
            tempTextArea.value = arguments[0];
            tempTextArea.style.position = 'fixed';
            tempTextArea.style.left = '-9999px';
            tempTextArea.style.top = '-9999px';
            document.body.appendChild(tempTextArea);
            
            // テキストを選択
            tempTextArea.select();
            tempTextArea.setSelectionRange(0, 99999);
            
            // コピー実行
            var copySuccess = false;
            try {
                copySuccess = document.execCommand('copy');
            } catch (err) {
                console.log('execCommand copy failed:', err);
            }
            
            // 隠し要素を削除
            document.body.removeChild(tempTextArea);
            
            return copySuccess;
            """
            
            copy_success = driver.execute_script(script, text)
            print(f"execCommand copy 結果: {copy_success}")
            
            if copy_success:
                # フォーカスを戻してペースト
                element.click()
                time.sleep(0.1)
                
                # ペースト実行
                if os.name == 'nt':  # Windows
                    element.send_keys(Keys.CONTROL + 'v')
                else:  # Mac/Linux
                    element.send_keys(Keys.COMMAND + 'v')
                
                time.sleep(0.3)
                
                # 入力確認
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ execCommand方式でテキスト入力成功")
                    return True
                    
        except Exception as e:
            print(f"execCommand方式エラー: {e}")
        
        # 方法2: navigator.clipboard.writeText (モダンブラウザ)
        try:
            print("方法2: navigator.clipboard.writeText")
            script = """
            return navigator.clipboard.writeText(arguments[0]).then(function() {
                return true;
            }).catch(function(err) {
                console.log('clipboard.writeText failed:', err);
                return false;
            });
            """
            
            # 非同期処理のため、同期的に実行
            copy_success = driver.execute_script("""
                var text = arguments[0];
                var callback = arguments[arguments.length - 1];
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function() {
                        callback(true);
                    }).catch(function(err) {
                        callback(false);
                    });
                } else {
                    callback(false);
                }
            """, text)
            
            if copy_success:
                time.sleep(0.2)
                element.click()
                time.sleep(0.1)
                
                # ペースト実行
                if os.name == 'nt':  # Windows
                    element.send_keys(Keys.CONTROL + 'v')
                else:  # Mac/Linux
                    element.send_keys(Keys.COMMAND + 'v')
                
                time.sleep(0.3)
                
                # 入力確認
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ navigator.clipboard方式でテキスト入力成功")
                    return True
                    
        except Exception as e:
            print(f"navigator.clipboard方式エラー: {e}")
        
        # 方法3: 直接DOM操作でクリップボードイベントをシミュレート
        try:
            print("方法3: クリップボードイベントシミュレーション")
            script = """
            var element = arguments[0];
            var text = arguments[1];
            
            // 要素にフォーカス
            element.focus();
            
            // クリップボードデータを含むペーストイベントを作成
            var pasteEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            // DataTransferオブジェクトにテキストデータを設定
            pasteEvent.clipboardData.setData('text/plain', text);
            
            // ペーストイベントをディスパッチ
            element.dispatchEvent(pasteEvent);
            
            // 要素の値を直接設定（フォールバック）
            if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                element.value = text;
            } else {
                element.textContent = text;
                element.innerHTML = text.replace(/\n/g, '<br>');
            }
            
            // 必要なイベントをトリガー
            ['input', 'change', 'keyup'].forEach(function(eventType) {
                var event = new Event(eventType, { bubbles: true, cancelable: true });
                element.dispatchEvent(event);
            });
            
            return element.textContent || element.value || '';
            """
            
            result = driver.execute_script(script, element, text)
            print(f"DOM操作結果: {result[:50]}...")
            time.sleep(0.3)
            
            # 入力確認
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ DOM操作方式でテキスト入力成功")
                return True
                
        except Exception as e:
            print(f"DOM操作方式エラー: {e}")
        
        # 方法4: Pyperclip を使用したシステムクリップボード操作（最後の手段）
        try:
            print("方法4: システムクリップボード（pyperclip）")
            # pyperclipがインストールされているかチェック
            try:
                import pyperclip
                pyperclip.copy(text)
                print("pyperclip でクリップボードにコピー完了")
                
                # 要素をクリックしてフォーカス
                element.click()
                time.sleep(0.2)
                
                # ペースト実行
                if os.name == 'nt':  # Windows
                    element.send_keys(Keys.CONTROL + 'v')
                else:  # Mac/Linux
                    element.send_keys(Keys.COMMAND + 'v')
                
                time.sleep(0.3)
                
                # 入力確認
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ pyperclip方式でテキスト入力成功")
                    return True
                    
            except ImportError:
                print("pyperclip がインストールされていません (pip install pyperclip)")
                
        except Exception as e:
            print(f"pyperclip方式エラー: {e}")
        
        print("❌ すべてのクリップボード方式が失敗しました")
        return False
        
    except Exception as e:
        print(f"❌ クリップボード入力で予期しないエラー: {e}")
        return False


def input_text_with_events_improved(driver, element, text):
    """改良版テキスト入力（コピペ優先）"""
    try:
        print(f"改良版テキスト入力開始: {text[:50]}...")
        
        # まずクリップボード方式を試行
        if input_text_with_clipboard(driver, element, text):
            return True
        
        print("クリップボード方式が失敗、フォールバック方式を試行...")
        
        # フォールバック1: JavaScriptでの直接設定
        try:
            print("フォールバック1: JavaScript直接設定")
            script = """
            var element = arguments[0];
            var text = arguments[1];
            
            // 要素にフォーカス
            element.focus();
            element.click();
            
            // React の内部プロパティを探す
            var reactKey = Object.keys(element).find(key => 
                key.startsWith('__reactInternalInstance') || 
                key.startsWith('__reactFiber') ||
                key.startsWith('__reactProps')
            );
            
            // 要素の値を設定
            if (element.tagName.toLowerCase() === 'textarea' || 
                (element.tagName.toLowerCase() === 'input' && element.type === 'text')) {
                element.value = text;
            } else {
                element.textContent = text;
                element.innerHTML = text.replace(/\\n/g, '<br>');
            }
            
            // React の onChange イベントを手動でトリガー
            if (reactKey) {
                var reactInstance = element[reactKey];
                if (reactInstance && reactInstance.memoizedProps && reactInstance.memoizedProps.onChange) {
                    reactInstance.memoizedProps.onChange({
                        target: element,
                        currentTarget: element,
                        type: 'change'
                    });
                }
            }
            
            // 標準的なイベントをディスパッチ
            var events = ['input', 'change', 'blur', 'focus'];
            events.forEach(function(eventType) {
                var event = new Event(eventType, { 
                    bubbles: true, 
                    cancelable: true 
                });
                element.dispatchEvent(event);
            });
            
            // キーボードイベントもトリガー
            ['keydown', 'keypress', 'keyup'].forEach(function(eventType) {
                var keyEvent = new KeyboardEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    key: 'Unidentified'
                });
                element.dispatchEvent(keyEvent);
            });
            
            return element.textContent || element.value || '';
            """
            
            result = driver.execute_script(script, element, text)
            print(f"JavaScript直接設定結果: {result[:50]}...")
            time.sleep(0.3)
            
            # 入力確認
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ JavaScript直接設定で成功")
                return True
                
        except Exception as e:
            print(f"JavaScript直接設定エラー: {e}")
        
        # フォールバック2: ゆっくりとした文字入力（最後の手段）
        try:
            print("フォールバック2: ゆっくり文字入力")
            element.clear()
            element.click()
            time.sleep(0.2)
            
            # 文字を少しずつ入力
            chunk_size = 10  # 10文字ずつ入力
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                element.send_keys(chunk)
                time.sleep(0.05)  # 各チャンクの間に遅延
            
            time.sleep(0.3)
            
            # 入力確認
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ ゆっくり文字入力で成功")
                return True
                
        except Exception as e:
            print(f"ゆっくり文字入力エラー: {e}")
        
        print("❌ すべての入力方式が失敗しました")
        return False
        
    except Exception as e:
        print(f"❌ 改良版テキスト入力で予期しないエラー: {e}")
        return False


# ========== 従来のテキスト入力機能（互換性のため残す） ==========

def input_text_with_events(driver, element, text):
    """テキストを確実に入力する（従来版）"""
    try:
        # 新しい改良版を呼び出す
        return input_text_with_events_improved(driver, element, text)
        
    except Exception as e:
        print(f"従来版テキスト入力エラー: {e}")
        return False


# ========== 改良版投稿機能 ==========

def post_tweet_with_image_improved(driver, message=DEFAULT_MESSAGE, image_path=DEFAULT_IMAGE_PATH):
    """画像付きツイートを投稿（改良版テキスト入力使用）"""
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
        
        # ホームページへ移動（既にホームページにいない場合のみ）
        current_url = driver.current_url
        if "/home" not in current_url:
            print("ホームページへ移動...")
            driver.get("https://twitter.com/home")
            time.sleep(1)
            error_reporter.add_success("tweet_with_image", "ホームページアクセス完了")
        else:
            print("既にホームページにいるため移動をスキップ")
            error_reporter.add_success("tweet_with_image", "ホームページ移動スキップ（既に移動済み）")
        
        # ツイート入力エリアをクリック
        print("入力エリアを探しています...")
        try:
            tweet_textarea = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            tweet_textarea.click()
            time.sleep(0.5)
            error_reporter.add_success("tweet_with_image", "ツイート入力エリア発見・クリック完了")
        except Exception as e:
            error_msg = f"ツイート入力エリアが見つかりません: {e}"
            error_reporter.add_error("tweet_with_image", error_msg, e)
            return False
        
        # テキスト入力（改良版を使用）
        print("メッセージを入力中...")
        text_input_success = input_text_with_events_improved(driver, tweet_textarea, message)
        
        if text_input_success:
            error_reporter.add_success("tweet_with_image", "メッセージ入力完了")
        else:
            error_reporter.add_warning("tweet_with_image", "メッセージ入力に問題がある可能性があります")
        
        # 画像アップロードボタンを探してクリック
        print("画像アップロードボタンを探しています...")
        try:
            # 直接ファイル入力要素を探す
            print("ファイル入力要素を検索中...")
            file_input = WebDriverWait(driver, 5).until(
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
            
            # アップロード完了確認
            print("アップロード完了を確認中...")
            upload_success = False
            
            # 簡単なセレクターでメディア要素をチェック
            simple_selectors = [
                '[data-testid="media"]',
                'img[src*="blob:"]',
                '[data-testid="removeMedia"]'
            ]
            
            for selector in simple_selectors:
                try:
                    WebDriverWait(driver, 2).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    print(f"✅ 画像アップロード完了確認（{selector}）")
                    upload_success = True
                    error_reporter.add_success("tweet_with_image", f"アップロード確認: {selector}")
                    break
                except:
                    continue
            
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
        
        time.sleep(0.5)
        
        # 投稿ボタンをクリック
        print("投稿ボタンを探しています...")
        try:
            post_button = find_tweet_button(driver)
            if not post_button:
                raise Exception("投稿ボタンが見つかりません")
            
            # JavaScriptでクリック（通常のクリックが失敗する場合があるため）
            driver.execute_script("arguments[0].click();", post_button)
            time.sleep(5)
            error_reporter.add_success("tweet_with_image", "投稿ボタンクリック完了")
        except Exception as e:
            error_msg = f"投稿ボタンクリックエラー: {e}"
            error_reporter.add_error("tweet_with_image", error_msg, e)
            return False
        
        # 投稿完了確認
        try:
            WebDriverWait(driver, 5).until(
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
            return True
        
    except Exception as e:
        error_msg = f"投稿エラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("tweet_with_image", error_msg, e)
        return False


def post_tweet_improved(driver, message=DEFAULT_MESSAGE):
    """テキストのみのツイートを投稿（改良版テキスト入力使用）"""
    try:
        print(f"ツイート投稿中: {message}")
        error_reporter.add_success("tweet_text_only", f"テキストツイート開始: {message}")
        
        # ホームページへ移動（既にホームページにいない場合のみ）
        current_url = driver.current_url
        if "/home" not in current_url:
            print("ホームページへ移動...")
            driver.get("https://twitter.com/home")
            time.sleep(1)
            error_reporter.add_success("tweet_text_only", "ホームページアクセス完了")
        else:
            print("既にホームページにいるため移動をスキップ")
            error_reporter.add_success("tweet_text_only", "ホームページ移動スキップ（既に移動済み）")
        
        # ツイート入力エリアをクリック
        print("入力エリアを探しています...")
        try:
            tweet_textarea = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            tweet_textarea.click()
            time.sleep(0.5)
            error_reporter.add_success("tweet_text_only", "ツイート入力エリア発見・クリック完了")
        except Exception as e:
            error_msg = f"ツイート入力エリアが見つかりません: {e}"
            error_reporter.add_error("tweet_text_only", error_msg, e)
            return False
        
        # テキスト入力（改良版を使用）
        print("メッセージを入力中...")
        text_input_success = input_text_with_events_improved(driver, tweet_textarea, message)
        
        if text_input_success:
            error_reporter.add_success("tweet_text_only", "メッセージ入力完了")
        else:
            error_reporter.add_warning("tweet_text_only", "メッセージ入力に問題がある可能性があります")
        
        time.sleep(1)
        
        # 投稿ボタンをクリック
        print("投稿ボタンを探しています...")
        try:
            post_button = find_tweet_button(driver)
            if not post_button:
                raise Exception("投稿ボタンが見つかりません")
            
            # JavaScriptでクリック
            driver.execute_script("arguments[0].click();", post_button)
            time.sleep(3)
            error_reporter.add_success("tweet_text_only", "投稿ボタンクリック完了")
        except Exception as e:
            error_msg = f"投稿ボタンクリックエラー: {e}"
            error_reporter.add_error("tweet_text_only", error_msg, e)
            return False
        
        # 投稿完了確認
        try:
            WebDriverWait(driver, 5).until(
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
            return True
        
    except Exception as e:
        error_msg = f"投稿エラー: {e}"
        print(f"❌ {error_msg}")
        error_reporter.add_error("tweet_text_only", error_msg, e)
        return False


# ========== 従来の投稿機能（互換性のため残す） ==========

def post_tweet_with_image(driver, message=DEFAULT_MESSAGE, image_path=DEFAULT_IMAGE_PATH):
    """画像付きツイートを投稿（従来版、内部的には改良版を呼び出し）"""
    return post_tweet_with_image_improved(driver, message, image_path)


def post_tweet(driver, message=DEFAULT_MESSAGE):
    """テキストのみのツイートを投稿（従来版、内部的には改良版を呼び出し）"""
    return post_tweet_improved(driver, message)


# ========== メイン処理 ==========

def main_improved(message=None, image_path=None, text_only=False, encoded_message=None):
    """メイン処理（改良版） - 成功時True、失敗時Falseを返す"""
    driver = None
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
        
        # localhost環境の場合はメッセージを100文字に制限（テスト用）
        # 複数の方法でlocalhost/開発環境を判定
        import socket
        try:
            hostname = socket.gethostname()
            # localhost環境の判定条件を複数チェック
            is_localhost = (
                # ホスト名チェック
                "localhost" in hostname.lower() or 
                hostname.lower() in ["localhost", "127.0.0.1"] or
                # 環境変数チェック
                os.getenv("NODE_ENV") == "development" or
                os.getenv("ENVIRONMENT") == "development" or
                os.getenv("ENVIRONMENT") == "local" or
                os.getenv("TWITTER_TEST_MODE") == "true" or
                # 開発フラグ
                os.getenv("DEV_MODE") == "true"
            )
            
            # さらに確実にするため、強制的にテストモードフラグもチェック
            if not is_localhost:
                # デバッグ用: 環境変数TWITTER_LIMIT_CHARSが設定されている場合も制限
                is_localhost = os.getenv("TWITTER_LIMIT_CHARS") == "true"
            
            if is_localhost and message and len(message) > 100:
                original_message = message
                message = message[:100] + "..."
                print(f"📝 localhost/開発環境のため、メッセージを100文字に制限")
                print(f"  元のメッセージ: {original_message[:50]}...")
                print(f"  制限後: {message}")
                print(f"  判定理由: ホスト名={hostname}, 環境変数確認済み")
                error_reporter.add_warning("main", f"localhost環境のため文字数制限適用: {len(original_message)}文字 → {len(message)}文字")
            else:
                print(f"📝 本番環境として判定: ホスト名={hostname}, 文字数制限なし")
        except Exception as e:
            print(f"環境判定エラー（処理は続行）: {e}")
        
        # 画像パスが指定されていない場合はデフォルトを使用
        if image_path is None and not text_only:
            image_path = DEFAULT_IMAGE_PATH
        
        # Chromeを直接起動
        driver = create_chrome_driver()
        if not driver:
            error_msg = "Chromeの起動に失敗しました"
            print(f"❌ {error_msg}")
            error_reporter.add_error("main", error_msg)
            error_reporter.set_final_result(False)
            return False
        
        # まずログイン状態をチェック
        is_logged_in = check_login_status(driver)
        
        # ログインが必要な場合のみログイン処理を実行
        if not is_logged_in:
            print("ログインが必要です。ログイン処理を開始します...")
            is_logged_in = twitter_login(driver)
        
        # ログイン済み（または新規ログイン成功）の場合、ツイート投稿
        if is_logged_in:
            if text_only:
                success = post_tweet_improved(driver, message)
            else:
                success = post_tweet_with_image_improved(driver, message, image_path)
            
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
        # 個別ドライバーのクリーンアップ（全体プロセスキルは行わない）
        if driver:
            try:
                cleanup_specific_driver(driver)
                error_reporter.add_success("cleanup", "個別ドライバークリーンアップ完了")
            except Exception as e:
                error_reporter.add_warning("cleanup", f"個別ドライバークリーンアップエラー: {e}")
                # エラー時のみ全体クリーンアップ
                try:
                    kill_all_chromedrivers()
                except:
                    pass


def main(message=None, image_path=None, text_only=False, encoded_message=None):
    """メイン処理（互換性維持用、内部的には改良版を呼び出し）"""
    return main_improved(message, image_path, text_only, encoded_message)


# ========== 簡単に使える関数 ==========

def quick_tweet(message=None):
    """簡単にテキストツイートを投稿する関数 - 成功時True、失敗時Falseを返す（改良版）"""
    return main_improved(message, text_only=True)


def quick_image_tweet(message=None, image_path=None):
    """簡単に画像付きツイートを投稿する関数 - 成功時True、失敗時Falseを返す（改良版）"""
    return main_improved(message, image_path)


# ========== ユーティリティ関数 ==========

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
            result = main_improved()
            
        elif sys.argv[1] == "--text-only":
            # テキストのみモード
            if len(sys.argv) > 2:
                message = " ".join(sys.argv[2:])
                print(f"📝 テキストのみ投稿（改良版）: {message}")
            else:
                message = None
                print("📝 デフォルトメッセージでテキスト投稿を実行します（改良版）")
            result = main_improved(message, text_only=True)
            
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
            
            result = main_improved(message, image_path)
            
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
                
                result = main_improved(encoded_message=encoded_message, image_path=image_path, text_only=(image_path is None))
            
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
                result = main_improved(message, image_path)
            else:
                # 第1引数が画像でない → テキストメッセージとして扱う
                message = " ".join(sys.argv[1:])
                print(f"📝 テキスト投稿（自動判定・改良版）: {message}")
                result = main_improved(message, text_only=True)
    
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
        
        # 結果を出力
        if result:
            print("\n🎉 最終結果: True - 処理成功（改良版テキスト入力使用）")
            exit(0)  # 成功の終了コード
        else:
            print("\n💥 最終結果: False - 処理失敗")
            exit(1)  # 失敗の終了コード