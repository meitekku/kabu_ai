import os
import time
import subprocess
import platform
import random
import tempfile
import shutil
import uuid
import signal
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
        lock_files = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile']
        for root, dirs, files in os.walk(path):
            for lock_file in lock_files:
                lock_path = os.path.join(root, lock_file)
                if os.path.exists(lock_path):
                    try:
                        os.chmod(lock_path, 0o777)
                        os.remove(lock_path)
                        print(f"✅ ロックファイル削除: {lock_file}")
                    except:
                        pass
        
        # ディレクトリの権限を変更
        try:
            os.chmod(path, 0o777)
            for root, dirs, files in os.walk(path):
                for d in dirs:
                    os.chmod(os.path.join(root, d), 0o777)
                for f in files:
                    os.chmod(os.path.join(root, f), 0o777)
        except:
            pass
        
        # プラットフォーム別の削除方法
        if platform.system() == "Windows":
            subprocess.run(['cmd', '/c', 'rmdir', '/s', '/q', path], 
                          shell=True, capture_output=True, timeout=10)
        else:
            # Unix系の場合
            subprocess.run(['rm', '-rf', path], capture_output=True, timeout=10)
        
        # まだ存在する場合はshutilで削除
        if os.path.exists(path):
            shutil.rmtree(path, ignore_errors=True)
        
        return not os.path.exists(path)
        
    except Exception as e:
        print(f"❌ ディレクトリ削除エラー: {e}")
        return False

def kill_chrome_processes_ubuntu():
    """Ubuntu環境でChrome関連のプロセスをより確実に終了"""
    print("🔍 Chrome関連プロセスの終了開始 (Ubuntu)...")
    
    try:
        # 1. lsofを使ってプロファイルディレクトリを使用しているプロセスを特定
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            try:
                result = subprocess.run(['lsof', '+D', PROFILE_PATH], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')[1:]  # ヘッダーをスキップ
                    pids = set()
                    for line in lines:
                        parts = line.split()
                        if len(parts) > 1:
                            pids.add(parts[1])
                    
                    for pid in pids:
                        try:
                            os.kill(int(pid), signal.SIGKILL)
                            print(f"✅ プロファイル使用プロセスを終了: PID {pid}")
                        except:
                            pass
            except:
                pass
        
        # 2. pgrep/pkillでより詳細なパターンマッチング
        chrome_patterns = [
            'chrome',
            'google-chrome',
            'chromium',
            'chromedriver',
            'Google Chrome',
            'Chromium',
            '/opt/google/chrome',
            '/usr/lib/chromium',
            '/usr/bin/google-chrome'
        ]
        
        for pattern in chrome_patterns:
            # まずPIDを取得
            try:
                result = subprocess.run(['pgrep', '-f', pattern], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and result.stdout:
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid:
                            try:
                                # SIGKILLで強制終了
                                os.kill(int(pid), signal.SIGKILL)
                                print(f"✅ プロセス終了: PID {pid} (pattern: {pattern})")
                            except:
                                pass
            except:
                pass
            
            # pkillでも終了を試みる
            subprocess.run(['pkill', '-9', '-f', pattern], 
                         capture_output=True, text=True, timeout=5)
        
        # 3. 特定のプロセス名で直接終了
        specific_processes = [
            'chrome',
            'chromium',
            'chromium-browser',
            'google-chrome',
            'google-chrome-stable',
            'chromedriver'
        ]
        
        for proc in specific_processes:
            subprocess.run(['killall', '-9', proc], 
                         capture_output=True, text=True, timeout=5)
        
        # 4. /proc をチェックして残っているChromeプロセスを探す
        try:
            for pid_dir in os.listdir('/proc'):
                if pid_dir.isdigit():
                    try:
                        cmdline_path = f'/proc/{pid_dir}/cmdline'
                        if os.path.exists(cmdline_path):
                            with open(cmdline_path, 'rb') as f:
                                cmdline = f.read().decode('utf-8', errors='ignore').lower()
                                if any(pattern in cmdline for pattern in ['chrome', 'chromium']):
                                    os.kill(int(pid_dir), signal.SIGKILL)
                                    print(f"✅ /proc経由でプロセス終了: PID {pid_dir}")
                    except:
                        pass
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
        patterns = [
            'twitter_chrome_*', 
            'chrome_profile_*', 
            '.org.chromium.*',
            'rust_mozprofile*',
            'snap.chromium*'
        ]
        
        for pattern in patterns:
            import glob
            old_profiles = glob.glob(os.path.join(temp_dir, pattern))
            for profile in old_profiles:
                try:
                    # プロファイルが24時間以上古い場合のみ削除
                    if os.path.exists(profile):
                        stat = os.stat(profile)
                        age = time.time() - stat.st_mtime
                        if age > 86400:  # 24時間
                            force_remove_directory(profile)
                            print(f"✅ 古いプロファイル削除: {profile}")
                except:
                    pass
    except Exception as e:
        print(f"⚠️ プロファイルクリーンアップエラー: {e}")

def create_chrome_driver():
    """Chrome WebDriverを作成する（Ubuntu環境対応版）"""
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
        
        # まず既存のChromeプロセスを終了（Ubuntu用の強化版）
        if platform.system() == "Linux":
            kill_chrome_processes_ubuntu()
        else:
            # 他のOSでは通常の終了処理
            kill_chrome_processes()
        
        # 古いプロファイルをクリーンアップ
        clean_old_profiles()
        
        # プロファイルパスを設定（環境に応じて）
        is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
        print(f"🔍 環境判定: NODE_ENV={os.environ.get('NODE_ENV')}, ENVIRONMENT={os.environ.get('ENVIRONMENT')}, is_production={is_production}")
        
        # プロファイルを使用するかどうかの判定
        use_profile = os.environ.get('USE_CHROME_PROFILE', 'true').lower() == 'true'
        
        # リトライ機能
        max_retries = 3
        for attempt in range(max_retries):
            try:
                options = webdriver.ChromeOptions()
                
                if use_profile:
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
                        # 開発環境
                        base_profile = os.path.join(os.path.expanduser('~'), '.twitter_chrome_profile')
                        PROFILE_PATH = f"{base_profile}_{timestamp}_{random_suffix}"
                        print(f"🔍 開発環境: プロファイルパス = {PROFILE_PATH}")
                    
                    # プロファイルディレクトリが既に存在する場合は強制削除
                    if os.path.exists(PROFILE_PATH):
                        force_remove_directory(PROFILE_PATH)
                    
                    # プロファイルディレクトリを作成
                    os.makedirs(PROFILE_PATH, exist_ok=True)
                    
                    # Chromeオプション設定
                    options.add_argument(f'--user-data-dir={PROFILE_PATH}')
                    options.add_argument('--profile-directory=Default')
                else:
                    print("🔍 プロファイルを使用しない設定")
                    # プロファイルを使用しない場合は、一時プロファイルを作成
                    options.add_argument('--no-default-browser-check')
                    options.add_argument('--no-first-run')
                
                # 基本オプション
                options.add_argument('--no-sandbox')
                options.add_argument('--disable-dev-shm-usage')
                options.add_argument('--disable-blink-features=AutomationControlled')
                options.add_experimental_option("excludeSwitches", ["enable-automation"])
                options.add_experimental_option('useAutomationExtension', False)
                
                # Ubuntu環境用の追加設定
                if platform.system() == "Linux":
                    options.add_argument('--disable-gpu')
                    options.add_argument('--disable-software-rasterizer')
                    options.add_argument('--disable-dev-shm-usage')
                    options.add_argument('--disable-setuid-sandbox')
                    options.add_argument('--no-zygote')
                    options.add_argument('--single-process')
                    options.add_argument('--disable-features=VizDisplayCompositor')
                
                # メモリ使用量を削減
                options.add_argument('--memory-pressure-off')
                options.add_argument('--disable-background-timer-throttling')
                options.add_argument('--disable-renderer-backgrounding')
                options.add_argument('--disable-features=site-per-process')
                
                # 言語設定（日本語）
                options.add_argument('--lang=ja-JP')
                prefs = {
                    'intl.accept_languages': 'ja,ja-JP,en-US,en',
                    'profile.default_content_setting_values.notifications': 2,
                    'profile.default_content_settings.popups': 0
                }
                options.add_experimental_option('prefs', prefs)
                
                # User-Agentを設定
                options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
                
                # ウィンドウサイズを設定
                options.add_argument('--window-size=1280,800')
                
                # ヘッドレスモードの判定
                if os.environ.get('HEADLESS', '').lower() == 'true':
                    options.add_argument('--headless=new')
                    print("🔍 ヘッドレスモード有効")
                
                # 一意のポート番号を生成（より広い範囲から）
                port = 9222 + random.randint(0, 19999)
                options.add_argument(f'--remote-debugging-port={port}')
                print(f"🔍 デバッグポート: {port}")
                
                print(f"🔍 WebDriverを作成中... (試行 {attempt + 1}/{max_retries})")
                
                # Chrome実行パスを明示的に指定（Ubuntu環境）
                if platform.system() == "Linux":
                    chrome_binary = get_chrome_binary_path()
                    if chrome_binary:
                        options.binary_location = chrome_binary
                        print(f"🔍 Chrome実行パス: {chrome_binary}")
                
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
                if attempt < max_retries - 1:
                    print(f"⚠️ WebDriver作成失敗 (試行 {attempt + 1}/{max_retries}): {e}")
                    time.sleep(5)
                    # プロファイルが原因の場合は、プロファイルを使わずに再試行
                    if "user data directory is already in use" in str(e):
                        use_profile = False
                        print("🔍 プロファイルなしで再試行します")
                else:
                    raise
        
    except Exception as e:
        print(f"❌ Chrome起動エラー: {e}")
        # エラー時はプロファイルディレクトリを削除
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            force_remove_directory(PROFILE_PATH)
        return None

def kill_chrome_processes():
    """Chrome関連のプロセスを終了（通常版）"""
    print("🔍 Chrome関連プロセスの終了開始...")
    
    try:
        system = platform.system()
        
        if system == "Windows":
            # Windows
            processes = ['chrome.exe', 'chromedriver.exe', 'Google Chrome']
            for proc in processes:
                subprocess.run(['taskkill', '/F', '/IM', proc], 
                             capture_output=True, text=True, timeout=5)
        else:
            # Unix系
            kill_patterns = [
                'chrome',
                'google-chrome',
                'chromium',
                'chromedriver',
                'Google Chrome',
                'Chromium'
            ]
            
            for pattern in kill_patterns:
                subprocess.run(['pkill', '-9', '-f', pattern], 
                             capture_output=True, text=True, timeout=5)
                subprocess.run(['killall', '-9', pattern], 
                             capture_output=True, text=True, timeout=5)
        
        time.sleep(3)
        print("✅ Chrome関連プロセスの終了完了")
        
    except Exception as e:
        print(f"⚠️ プロセス終了エラー: {e}")

def cleanup_specific_driver(driver):
    """特定のWebDriverインスタンスをクリーンアップ"""
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
    """すべてのChromeDriveプロセスを強制終了"""
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
        if platform.system() == "Linux":
            kill_chrome_processes_ubuntu()
        else:
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
            "/snap/bin/chromium",
            "/opt/google/chrome/chrome",
            "/opt/google/chrome/google-chrome"
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
            for cmd in ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']:
                result = subprocess.run(['which', cmd], 
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