import os
import time
import subprocess
import platform
import random
import tempfile
import shutil
import uuid
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

def force_remove_directory(path):
    """ディレクトリを強制的に削除"""
    if not os.path.exists(path):
        return True
    
    try:
        # まずロックファイルを削除
        lock_files = ['SingletonLock', 'SingletonSocket', 'SingletonCookie']
        for lock_file in lock_files:
            lock_path = os.path.join(path, lock_file)
            if os.path.exists(lock_path):
                try:
                    os.remove(lock_path)
                    print(f"✅ ロックファイル削除: {lock_file}")
                except:
                    pass
        
        # プラットフォーム別の削除方法
        if platform.system() == "Windows":
            # Windowsの場合
            subprocess.run(['cmd', '/c', 'rmdir', '/s', '/q', path], 
                          shell=True, capture_output=True, timeout=10)
            # 追加でPowerShellを使用
            if os.path.exists(path):
                subprocess.run(['powershell', '-Command', f'Remove-Item -Path "{path}" -Recurse -Force'], 
                              capture_output=True, timeout=10)
        else:
            # Unix系の場合
            subprocess.run(['rm', '-rf', path], capture_output=True, timeout=10)
            # 追加で強制削除
            if os.path.exists(path):
                subprocess.run(['find', path, '-type', 'f', '-exec', 'rm', '-f', '{}', '+'], 
                              capture_output=True, timeout=10)
                subprocess.run(['find', path, '-type', 'd', '-exec', 'rmdir', '{}', '+'], 
                              capture_output=True, timeout=10)
        
        # まだ存在する場合はshutilで削除
        if os.path.exists(path):
            shutil.rmtree(path, ignore_errors=True)
        
        # 最終確認
        return not os.path.exists(path)
        
    except Exception as e:
        print(f"❌ ディレクトリ削除エラー: {e}")
        return False

def kill_chrome_processes():
    """Chrome関連のプロセスをより確実に終了"""
    print("🔍 Chrome関連プロセスの終了開始...")
    
    try:
        # プラットフォーム別のプロセス終了
        system = platform.system()
        
        if system == "Windows":
            # Windows
            processes = ['chrome.exe', 'chromedriver.exe', 'Google Chrome']
            for proc in processes:
                subprocess.run(['taskkill', '/F', '/IM', proc], 
                             capture_output=True, text=True, timeout=5)
                subprocess.run(['wmic', 'process', 'where', f'name="{proc}"', 'delete'], 
                             capture_output=True, text=True, timeout=5)
        else:
            # Unix系
            # より強力なkillコマンド
            kill_patterns = [
                'chrome',
                'google-chrome',
                'chromium',
                'chromedriver',
                'Google Chrome',
                'Chromium'
            ]
            
            for pattern in kill_patterns:
                # SIGKILL (-9) で強制終了
                subprocess.run(['pkill', '-9', '-f', pattern], 
                             capture_output=True, text=True, timeout=5)
                subprocess.run(['killall', '-9', pattern], 
                             capture_output=True, text=True, timeout=5)
            
            # プロセスIDを直接取得して終了
            try:
                result = subprocess.run(['pgrep', '-f', 'chrome'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid:
                            subprocess.run(['kill', '-9', pid], 
                                         capture_output=True, timeout=5)
            except:
                pass
        
        # プロセス終了を待機
        time.sleep(5)
        print("✅ Chrome関連プロセスの終了完了")
        
    except Exception as e:
        print(f"⚠️ プロセス終了エラー: {e}")

def clean_old_profiles():
    """古いプロファイルディレクトリをクリーンアップ"""
    try:
        temp_dir = tempfile.gettempdir()
        patterns = ['twitter_chrome_*', 'chrome_profile_*', '.org.chromium.*']
        
        for pattern in patterns:
            import glob
            old_profiles = glob.glob(os.path.join(temp_dir, pattern))
            for profile in old_profiles:
                try:
                    force_remove_directory(profile)
                    print(f"✅ 古いプロファイル削除: {profile}")
                except:
                    pass
    except Exception as e:
        print(f"⚠️ プロファイルクリーンアップエラー: {e}")

def create_chrome_driver():
    """Chrome WebDriverを作成する（プロファイル再利用）"""
    global REUSABLE_DRIVER, PROFILE_PATH
    
    # 既存のドライバーをクリーンアップ
    if REUSABLE_DRIVER:
        try:
            REUSABLE_DRIVER.quit()
        except:
            pass
        REUSABLE_DRIVER = None
    
    try:
        print("🔍 === Chrome起動デバッグ開始 ===")
        
        # まず既存のChromeプロセスを終了
        kill_chrome_processes()
        
        # 古いプロファイルをクリーンアップ
        clean_old_profiles()
        
        options = webdriver.ChromeOptions()
        
        # プロファイルパスを設定（環境に応じて）
        is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
        print(f"🔍 環境判定: NODE_ENV={os.environ.get('NODE_ENV')}, ENVIRONMENT={os.environ.get('ENVIRONMENT')}, is_production={is_production}")
        
        # より一意なプロファイルパスを生成
        unique_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000000)  # マイクロ秒単位
        process_id = os.getpid()
        random_suffix = random.randint(10000, 99999)
        
        if is_production:
            # 本番環境
            temp_base = tempfile.gettempdir()
            PROFILE_PATH = os.path.join(temp_base, f'chrome_profile_{unique_id}_{timestamp}_{process_id}_{random_suffix}')
            print(f"🔍 本番環境: 新しい一意プロファイルパス = {PROFILE_PATH}")
        else:
            # 開発環境では固定プロファイルを使用（ただし既存のものは削除）
            base_profile = os.path.join(os.path.expanduser('~'), '.twitter_chrome_profile')
            PROFILE_PATH = f"{base_profile}_{timestamp}"
            print(f"🔍 開発環境: プロファイルパス = {PROFILE_PATH}")
        
        # プロファイルディレクトリが既に存在する場合は強制削除
        if os.path.exists(PROFILE_PATH):
            print(f"⚠️ 既存のプロファイルディレクトリを削除: {PROFILE_PATH}")
            if not force_remove_directory(PROFILE_PATH):
                # 削除できない場合は別のパスを使用
                PROFILE_PATH = f"{PROFILE_PATH}_alt_{random.randint(1000, 9999)}"
                print(f"🔍 代替プロファイルパス: {PROFILE_PATH}")
        
        # プロファイルディレクトリを作成
        os.makedirs(PROFILE_PATH, exist_ok=True)
        
        # Chromeオプション設定
        options.add_argument(f'--user-data-dir={PROFILE_PATH}')
        options.add_argument('--profile-directory=Default')
        
        # 基本オプション
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # クラッシュ関連の設定を追加
        options.add_argument('--disable-features=RendererCodeIntegrity')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        options.add_argument('--disable-javascript')  # 必要に応じて削除
        
        # プロセス分離を無効化（リソース節約）
        options.add_argument('--single-process')
        options.add_argument('--disable-features=site-per-process')
        
        # その他の安定性向上オプション
        options.add_argument('--disable-background-timer-throttling')
        options.add_argument('--disable-backgrounding-occluded-windows')
        options.add_argument('--disable-renderer-backgrounding')
        
        # 言語設定（日本語）
        options.add_argument('--lang=ja-JP')
        options.add_experimental_option('prefs', {
            'intl.accept_languages': 'ja,ja-JP,en-US,en',
            'profile.default_content_setting_values.notifications': 2,
            'profile.default_content_settings.popups': 0
        })
        
        # User-Agentを設定
        options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # ウィンドウサイズを設定
        options.add_argument('--window-size=1280,800')
        
        # ヘッドレスモードの判定
        if os.environ.get('HEADLESS', '').lower() == 'true':
            options.add_argument('--headless=new')
            print("🔍 ヘッドレスモード有効")
        
        # 一意のポート番号を生成（より広い範囲から）
        port = 9222 + random.randint(0, 9999)
        options.add_argument(f'--remote-debugging-port={port}')
        print(f"🔍 デバッグポート: {port}")
        
        print("🔍 WebDriverを作成中...")
        
        # リトライ機能を追加
        max_retries = 3
        for attempt in range(max_retries):
            try:
                driver = webdriver.Chrome(options=options)
                print("✅ WebDriver作成成功")
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"⚠️ WebDriver作成失敗 (試行 {attempt + 1}/{max_retries}): {e}")
                    time.sleep(3)
                    # プロファイルパスを変更して再試行
                    PROFILE_PATH = f"{PROFILE_PATH}_retry{attempt + 1}"
                    options.arguments = [arg for arg in options.arguments if not arg.startswith('--user-data-dir=')]
                    options.add_argument(f'--user-data-dir={PROFILE_PATH}')
                else:
                    raise
        
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
        # エラー時はプロファイルディレクトリを削除
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            force_remove_directory(PROFILE_PATH)
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
        
        # プロファイルディレクトリを削除
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            time.sleep(2)  # プロセス終了を待つ
            force_remove_directory(PROFILE_PATH)
        
    except Exception as e:
        print(f"⚠️ ドライバークリーンアップエラー: {e}")

def kill_all_chromedrivers():
    """すべてのChromeDriveプロセスを強制終了（プロファイル再利用版）"""
    global REUSABLE_DRIVER, PROFILE_PATH
    
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
        
        # Chrome関連プロセスを終了
        kill_chrome_processes()
        
        # プロファイルディレクトリを削除
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            force_remove_directory(PROFILE_PATH)
            PROFILE_PATH = None
        
        # 古いプロファイルもクリーンアップ
        clean_old_profiles()
        
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
    global REUSABLE_DRIVER, PROFILE_PATH
    REUSABLE_DRIVER = None
    PROFILE_PATH = None
    kill_all_chromedrivers()

# 終了時のクリーンアップ用
import atexit
atexit.register(kill_all_chromedrivers)