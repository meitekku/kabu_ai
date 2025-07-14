import os
import time
import subprocess
import platform
import random
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException

# グローバル変数でドライバーIDを管理
DRIVER_REGISTRY = {}

# 再利用可能なドライバーの管理
REUSABLE_DRIVER = None
PROFILE_PATH = None

def generate_driver_id():
    """一意のドライバーIDを生成"""
    return f"{int(time.time() * 1000)}_{random.randint(1000, 9999)}"

def register_driver(driver, driver_id=None):
    """ドライバーを登録"""
    if not driver_id:
        driver_id = generate_driver_id()
    DRIVER_REGISTRY[driver_id] = driver
    driver._custom_id = driver_id
    return driver_id

def unregister_driver(driver_id):
    """ドライバーの登録を解除"""
    if driver_id in DRIVER_REGISTRY:
        del DRIVER_REGISTRY[driver_id]

def create_chrome_driver():
    """Chrome WebDriverを作成する（プロファイル再利用）"""
    global REUSABLE_DRIVER, PROFILE_PATH
    
    # 本番環境では再利用しない（プロファイル競合を避けるため）
    if os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production':
        print("🔍 本番環境: ドライバー再利用をスキップ")
        REUSABLE_DRIVER = None
    else:
        # 既存のドライバーが有効か確認
        if REUSABLE_DRIVER is not None:
            try:
                # 簡単なテストを実行してドライバーが生きているか確認
                REUSABLE_DRIVER.current_url
                print("✅ 既存のChromeドライバーを再利用")
                return REUSABLE_DRIVER
            except Exception as e:
                print(f"⚠️ 既存のドライバーが無効、新しいドライバーを作成: {e}")
                REUSABLE_DRIVER = None
    
    try:
        print("🔍 === Chrome起動デバッグ開始 ===")
        
        options = webdriver.ChromeOptions()
        
        # 本番環境ではプロファイルを使用しない
        is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
        print(f"🔍 環境判定: NODE_ENV={os.environ.get('NODE_ENV')}, ENVIRONMENT={os.environ.get('ENVIRONMENT')}, is_production={is_production}")
        
        if not is_production:
            # 開発環境のみプロファイルを使用
            if PROFILE_PATH is None:
                PROFILE_PATH = os.path.join(os.path.expanduser('~'), '.twitter_chrome_profile')
                print(f"🔍 開発環境: 固定プロファイルパス = {PROFILE_PATH}")
            
            options.add_argument(f'--user-data-dir={PROFILE_PATH}')
            options.add_argument('--profile-directory=Default')
            print(f"🔍 Chrome起動オプション: --user-data-dir={PROFILE_PATH}")
        else:
            print("🔍 本番環境: プロファイルを使用せず起動")
        
        # 基本オプション
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # 本番環境では追加の設定を行う
        if is_production:
            # 本番環境専用の設定
            options.add_argument('--no-first-run')
            options.add_argument('--disable-default-apps')
            options.add_argument('--disable-extensions')
            options.add_argument('--disable-plugins')
            options.add_argument('--disable-web-security')
            options.add_argument('--disable-features=VizDisplayCompositor')
            options.add_argument('--disable-ipc-flooding-protection')
            # 一時ディレクトリを明示的に設定
            import tempfile
            temp_dir = tempfile.mkdtemp(prefix='chrome_temp_')
            options.add_argument(f'--temp-profile')
            options.add_argument(f'--user-data-dir={temp_dir}')
            print(f"🔍 本番環境: 一時プロファイルディレクトリ = {temp_dir}")
        
        # 言語設定（日本語）
        options.add_argument('--lang=ja-JP')
        options.add_experimental_option('prefs', {
            'intl.accept_languages': 'ja,ja-JP,en-US,en'
        })
        
        # ポップアップとプロンプトを無効化
        options.add_argument('--disable-popup-blocking')
        options.add_argument('--disable-notifications')
        
        # GPUとWebGLの設定
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-software-rasterizer')
        
        # User-Agentを設定
        options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # ウィンドウサイズを設定
        options.add_argument('--window-size=1280,800')
        
        # その他の最適化
        options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        
        # ヘッドレスモードの判定
        if os.environ.get('HEADLESS', '').lower() == 'true':
            options.add_argument('--headless=new')
            print("🔍 ヘッドレスモード有効")
        
        # 一意のポート番号を生成
        port = 9222 + random.randint(0, 999)
        options.add_argument(f'--remote-debugging-port={port}')
        print(f"🔍 デバッグポート: {port}")
        
        # 全てのChrome/ChromeDriverプロセスを強制終了
        if is_production:
            print("🔍 本番環境: 既存のChrome/ChromeDriverプロセスを強制終了")
            try:
                subprocess.run(['pkill', '-f', 'chrome'], capture_output=True, text=True)
                subprocess.run(['pkill', '-f', 'chromedriver'], capture_output=True, text=True)
                time.sleep(1)  # プロセス終了待機
                print("✅ 既存のプロセスを強制終了完了")
            except Exception as e:
                print(f"⚠️ プロセス終了エラー: {e}")
        
        # デバッグ: 現在のオプションを表示
        print("🔍 Chrome起動オプション一覧:")
        for i, arg in enumerate(options.arguments):
            print(f"  {i+1}: {arg}")
        
        # WebDriverを作成
        print("🔍 WebDriverを作成中...")
        driver = webdriver.Chrome(options=options)
        print("✅ WebDriver作成成功")
        
        # ページロードタイムアウトを設定
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        
        # Webdriverプロパティを削除（検出回避）
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            '''
        })
        
        # ドライバーを登録
        driver_id = register_driver(driver)
        
        # グローバル変数に保存（開発環境のみ）
        if not is_production:
            REUSABLE_DRIVER = driver
        
        print(f"✅ Chrome起動完了！ID: {driver_id[:8]}, ポート: {port}")
        return driver
        
    except Exception as e:
        print(f"❌ Chrome起動エラー: {e}")
        return None

def cleanup_specific_driver(driver):
    """特定のWebDriverインスタンスをクリーンアップ（プロファイル再利用版）"""
    global REUSABLE_DRIVER
    
    if driver is None:
        return
    
    # 再利用可能なドライバーの場合はクリーンアップしない
    if driver == REUSABLE_DRIVER:
        print("✅ 再利用可能なドライバーはクリーンアップをスキップ")
        return
    
    try:
        driver_id = getattr(driver, '_custom_id', 'unknown')
        print(f"ドライバー個別クリーンアップ開始: ID={driver_id[:8] if driver_id != 'unknown' else 'unknown'}")
        
        # セッションIDを取得
        session_id = driver.session_id if hasattr(driver, 'session_id') else None
        
        # ドライバーを終了
        try:
            driver.quit()
            print("✅ driver.quit() 成功")
        except Exception as e:
            print(f"⚠️ driver.quit() エラー: {e}")
        
        # 登録解除
        if driver_id != 'unknown':
            unregister_driver(driver_id)
        
        # psutilが利用可能な場合、関連プロセスを終了
        try:
            import psutil
            
            # ChromeDriverプロセスを探して終了
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    pinfo = proc.info
                    if pinfo['name'] and 'chromedriver' in pinfo['name'].lower():
                        # セッションIDがコマンドラインに含まれているか確認
                        if session_id and pinfo['cmdline']:
                            cmdline_str = ' '.join(pinfo['cmdline'])
                            if session_id in cmdline_str:
                                proc.terminate()
                                proc.wait(timeout=5)
                                print(f"✅ 関連ChromeDriverプロセス (PID: {pinfo['pid']}) を終了")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                    
        except ImportError:
            pass  # psutilがインストールされていない場合は無視
        
    except Exception as e:
        print(f"⚠️ ドライバークリーンアップエラー: {e}")

def kill_all_chromedrivers():
    """すべてのChromeDriveプロセスを強制終了（プロファイル再利用版）"""
    global REUSABLE_DRIVER
    
    try:
        print("全ChromeDriverプロセスの終了開始...")
        
        # 再利用可能なドライバーをクリーンアップ
        if REUSABLE_DRIVER is not None:
            try:
                REUSABLE_DRIVER.quit()
                print("✅ 再利用可能なドライバーを終了")
            except:
                pass
            REUSABLE_DRIVER = None
        
        # 登録されているすべてのドライバーを終了
        for driver_id, driver in list(DRIVER_REGISTRY.items()):
            try:
                driver.quit()
            except:
                pass
            unregister_driver(driver_id)
        
        # プラットフォームに応じてコマンドを実行
        system = platform.system()
        
        if system == "Windows":
            # Windows
            subprocess.run(['taskkill', '/F', '/IM', 'chromedriver.exe'], 
                         capture_output=True, text=True)
            subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], 
                         capture_output=True, text=True)
        elif system == "Darwin":
            # macOS
            subprocess.run(['pkill', '-f', 'chromedriver'], 
                         capture_output=True, text=True)
            subprocess.run(['pkill', '-f', 'Google Chrome'], 
                         capture_output=True, text=True)
        else:
            # Linux
            subprocess.run(['pkill', '-f', 'chromedriver'], 
                         capture_output=True, text=True)
            subprocess.run(['pkill', '-f', 'chrome'], 
                         capture_output=True, text=True)
        
        print("✅ 全ChromeDriverプロセスを終了しました")
        
    except Exception as e:
        print(f"⚠️ ChromeDriverプロセス終了エラー: {e}")

def get_chrome_binary_path():
    """Chromeの実行ファイルパスを取得"""
    system = platform.system()
    
    if system == "Windows":
        paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
        ]
    elif system == "Darwin":  # macOS
        paths = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            os.path.expanduser("~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        ]
    else:  # Linux
        paths = [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/snap/bin/chromium"
        ]
    
    # 環境変数から取得
    env_path = os.environ.get('CHROME_BINARY_PATH')
    if env_path and os.path.exists(env_path):
        return env_path
    
    # 各パスをチェック
    for path in paths:
        if os.path.exists(path):
            return path
    
    # whichコマンドで探す（Unix系のみ）
    if system != "Windows":
        try:
            result = subprocess.run(['which', 'google-chrome'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.strip()
        except:
            pass
    
    return None

def force_cleanup_all():
    """強制的にすべてのドライバーをクリーンアップ"""
    global REUSABLE_DRIVER
    REUSABLE_DRIVER = None
    kill_all_chromedrivers()

# 終了時のクリーンアップ用
import atexit
atexit.register(kill_all_chromedrivers)