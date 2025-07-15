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
    """Ubuntu環境でChrome関連のプロセスをより確実に終了（改良版）"""
    print("🔍 Chrome関連プロセスの終了開始 (Ubuntu改良版)...")
    
    try:
        # 1. まずすべてのChrome関連プロセスを探す
        chrome_pids = set()
        
        # lsofを使ってプロファイルディレクトリを使用しているプロセスを特定
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            try:
                result = subprocess.run(['lsof', '+D', PROFILE_PATH], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')[1:]  # ヘッダーをスキップ
                    for line in lines:
                        parts = line.split()
                        if len(parts) > 1:
                            chrome_pids.add(parts[1])
                            print(f"🔍 プロファイル使用プロセス発見: PID {parts[1]}")
            except:
                pass
        
        # 2. pgrep/psでより詳細なパターンマッチング
        chrome_patterns = [
            'chrome',
            'google-chrome',
            'chromium',
            'chromedriver',
            'Google Chrome',
            'Chromium',
            '/opt/google/chrome',
            '/usr/lib/chromium',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/snap/bin/chromium'
        ]
        
        for pattern in chrome_patterns:
            # pgrepでPIDを取得
            try:
                result = subprocess.run(['pgrep', '-f', pattern], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and result.stdout:
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid:
                            chrome_pids.add(pid)
                            print(f"🔍 pgrep経由でプロセス発見: PID {pid} (pattern: {pattern})")
            except:
                pass
            
            # psでも探す
            try:
                result = subprocess.run(['ps', 'aux'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')[1:]  # ヘッダーをスキップ
                    for line in lines:
                        if pattern.lower() in line.lower():
                            parts = line.split()
                            if len(parts) > 1:
                                chrome_pids.add(parts[1])
                                print(f"🔍 ps経由でプロセス発見: PID {parts[1]} (pattern: {pattern})")
            except:
                pass
        
        # 3. /proc をチェックして残っているChromeプロセスを探す
        try:
            for pid_dir in os.listdir('/proc'):
                if pid_dir.isdigit():
                    try:
                        cmdline_path = f'/proc/{pid_dir}/cmdline'
                        if os.path.exists(cmdline_path):
                            with open(cmdline_path, 'rb') as f:
                                cmdline = f.read().decode('utf-8', errors='ignore').lower()
                                if any(pattern in cmdline for pattern in ['chrome', 'chromium']):
                                    chrome_pids.add(pid_dir)
                                    print(f"🔍 /proc経由でプロセス発見: PID {pid_dir}")
                    except:
                        pass
        except:
            pass
        
        # 4. 発見したプロセスをすべて終了
        print(f"🔍 終了対象プロセス数: {len(chrome_pids)}")
        for pid in chrome_pids:
            try:
                pid_int = int(pid)
                # まずSIGTERMで優雅に終了
                try:
                    os.kill(pid_int, signal.SIGTERM)
                    print(f"✅ SIGTERM送信: PID {pid}")
                except:
                    pass
                
                # 少し待機
                time.sleep(0.5)
                
                # SIGKILLで強制終了
                try:
                    os.kill(pid_int, signal.SIGKILL)
                    print(f"✅ SIGKILL送信: PID {pid}")
                except:
                    pass
            except:
                pass
        
        # 5. killallとpkillでも追加で終了を試みる
        specific_processes = [
            'chrome',
            'chromium',
            'chromium-browser',
            'google-chrome',
            'google-chrome-stable',
            'chromedriver'
        ]
        
        for proc in specific_processes:
            # killallで終了
            subprocess.run(['killall', '-TERM', proc], 
                         capture_output=True, text=True, timeout=5)
            time.sleep(0.5)
            subprocess.run(['killall', '-KILL', proc], 
                         capture_output=True, text=True, timeout=5)
            
            # pkillでも終了
            subprocess.run(['pkill', '-TERM', '-f', proc], 
                         capture_output=True, text=True, timeout=5)
            time.sleep(0.5)
            subprocess.run(['pkill', '-KILL', '-f', proc], 
                         capture_output=True, text=True, timeout=5)
        
        # 6. Chrome関連のロックファイルを削除
        lock_patterns = [
            '/tmp/.org.chromium.*',
            '/tmp/.com.google.Chrome.*',
            '/tmp/chrome_*',
            '/dev/shm/chrome_*',
            '/var/tmp/chrome_*'
        ]
        
        for pattern in lock_patterns:
            try:
                import glob
                lock_files = glob.glob(pattern)
                for lock_file in lock_files:
                    try:
                        if os.path.exists(lock_file):
                            if os.path.isfile(lock_file):
                                os.remove(lock_file)
                            else:
                                force_remove_directory(lock_file)
                            print(f"✅ ロックファイル削除: {lock_file}")
                    except:
                        pass
            except:
                pass
        
        # プロセス終了を待機
        time.sleep(3)
        
        # 7. 最終確認
        remaining_pids = set()
        for pattern in chrome_patterns:
            try:
                result = subprocess.run(['pgrep', '-f', pattern], 
                                      capture_output=True, text=True, timeout=3)
                if result.returncode == 0 and result.stdout:
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid:
                            remaining_pids.add(pid)
            except:
                pass
        
        if remaining_pids:
            print(f"⚠️ まだ残っているプロセス: {remaining_pids}")
        else:
            print("✅ すべてのChrome関連プロセスが終了しました")
        
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
    """Chrome WebDriverを作成する（Ubuntu環境対応版・改良版）"""
    global REUSABLE_DRIVER, PROFILE_PATH
    
    # 既存のドライバーをクリーンアップ
    if REUSABLE_DRIVER:
        try:
            REUSABLE_DRIVER.quit()
        except:
            pass
        REUSABLE_DRIVER = None
    
    try:
        print("🔍 === Chrome起動デバッグ開始 (Ubuntu特化版) ===")
        
        # まず既存のChromeプロセスを終了（Ubuntu用の強化版）
        if platform.system() == "Linux":
            kill_chrome_processes_ubuntu()
        else:
            kill_chrome_processes()
        
        # 古いプロファイルをクリーンアップ
        clean_old_profiles()
        
        # 環境判定
        is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
        print(f"🔍 環境判定: NODE_ENV={os.environ.get('NODE_ENV')}, ENVIRONMENT={os.environ.get('ENVIRONMENT')}, is_production={is_production}")
        
        # Ubuntu環境では複数の起動方法を試行
        startup_methods = []
        
        # 方法1: プロファイルを完全に使わない（最も確実）
        startup_methods.append({
            'name': 'No Profile (最も確実)',
            'use_profile': False,
            'options': ['--no-default-browser-check', '--no-first-run', '--disable-user-media-security=true']
        })
        
        # 方法2: 一時プロファイルを使用
        startup_methods.append({
            'name': 'Temporary Profile',
            'use_profile': True,
            'temp_profile': True,
            'options': []
        })
        
        # 方法3: 複数のプロファイルパスを試行
        startup_methods.append({
            'name': 'Multiple Profile Paths',
            'use_profile': True,
            'multiple_paths': True,
            'options': []
        })
        
        # 方法4: Incognito モード
        startup_methods.append({
            'name': 'Incognito Mode',
            'use_profile': False,
            'options': ['--incognito', '--no-default-browser-check', '--no-first-run']
        })
        
        # 各方法を試行
        for method_idx, method in enumerate(startup_methods):
            print(f"\n🔍 === 方法 {method_idx + 1}: {method['name']} ===")
            
            max_retries = 3 if method.get('multiple_paths') else 1
            
            for attempt in range(max_retries):
                try:
                    options = webdriver.ChromeOptions()
                    
                    # プロファイル設定
                    if method.get('use_profile'):
                        unique_id = str(uuid.uuid4())
                        timestamp = int(time.time() * 1000000)
                        process_id = os.getpid()
                        random_suffix = random.randint(10000, 99999)
                        
                        if method.get('temp_profile'):
                            # /tmp配下に一時プロファイルを作成
                            PROFILE_PATH = f"/tmp/chrome_temp_{unique_id}_{timestamp}"
                        elif method.get('multiple_paths'):
                            # 複数の場所を試行
                            possible_bases = [
                                f"/tmp/chrome_profile_{attempt}",
                                f"/var/tmp/chrome_profile_{attempt}",
                                f"/dev/shm/chrome_profile_{attempt}",
                                f"{tempfile.gettempdir()}/chrome_profile_{attempt}"
                            ]
                            PROFILE_PATH = f"{possible_bases[attempt % len(possible_bases)]}_{unique_id}_{timestamp}"
                        else:
                            # 標準プロファイル
                            temp_base = tempfile.gettempdir()
                            PROFILE_PATH = os.path.join(temp_base, f'chrome_profile_{unique_id}_{timestamp}_{process_id}_{random_suffix}')
                        
                        print(f"🔍 プロファイルパス: {PROFILE_PATH}")
                        
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
                        PROFILE_PATH = None
                    
                    # 方法固有のオプション
                    for option in method.get('options', []):
                        options.add_argument(option)
                    
                    # 基本オプション（Ubuntu環境重視）
                    options.add_argument('--no-sandbox')
                    options.add_argument('--disable-dev-shm-usage')
                    options.add_argument('--disable-blink-features=AutomationControlled')
                    options.add_experimental_option("excludeSwitches", ["enable-automation"])
                    options.add_experimental_option('useAutomationExtension', False)
                    
                    # Ubuntu環境用の追加設定
                    if platform.system() == "Linux":
                        options.add_argument('--disable-gpu')
                        options.add_argument('--disable-software-rasterizer')
                        options.add_argument('--disable-setuid-sandbox')
                        options.add_argument('--no-zygote')
                        options.add_argument('--single-process')
                        options.add_argument('--disable-features=VizDisplayCompositor')
                        options.add_argument('--disable-web-security')
                        options.add_argument('--disable-features=site-per-process')
                        options.add_argument('--disable-background-timer-throttling')
                        options.add_argument('--disable-renderer-backgrounding')
                        options.add_argument('--disable-backgrounding-occluded-windows')
                        options.add_argument('--disable-ipc-flooding-protection')
                        options.add_argument('--disable-extensions')
                        options.add_argument('--disable-default-apps')
                        options.add_argument('--disable-component-update')
                        options.add_argument('--disable-background-networking')
                        options.add_argument('--disable-sync')
                        options.add_argument('--disable-translate')
                        options.add_argument('--disable-plugins')
                        options.add_argument('--disable-plugins-discovery')
                        options.add_argument('--disable-prerender-local-predictor')
                        options.add_argument('--disable-domain-reliability')
                        options.add_argument('--disable-component-extensions-with-background-pages')
                        options.add_argument('--disable-client-side-phishing-detection')
                        options.add_argument('--disable-hang-monitor')
                        options.add_argument('--disable-prompt-on-repost')
                        options.add_argument('--disable-background-timer-throttling')
                        options.add_argument('--disable-renderer-backgrounding')
                        options.add_argument('--disable-backgrounding-occluded-windows')
                        options.add_argument('--disable-ipc-flooding-protection')
                        options.add_argument('--metrics-recording-only')
                        options.add_argument('--no-report-upload')
                        options.add_argument('--enable-automation')
                        options.add_argument('--password-store=basic')
                        options.add_argument('--use-mock-keychain')
                    
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
                    
                    print(f"🔍 WebDriverを作成中... (方法 {method_idx + 1}, 試行 {attempt + 1}/{max_retries})")
                    
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
                    try:
                        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                            'source': '''
                                Object.defineProperty(navigator, 'webdriver', {
                                    get: () => undefined
                                });
                            '''
                        })
                    except:
                        pass
                    
                    # ドライバーを登録
                    driver_id = register_driver(driver)
                    
                    # グローバル変数に保存（開発環境のみ）
                    if not is_production:
                        REUSABLE_DRIVER = driver
                    
                    print(f"✅ Chrome起動完了！ID: {driver_id[:8]}, ポート: {port}, 方法: {method['name']}")
                    return driver
                    
                except Exception as e:
                    print(f"⚠️ WebDriver作成失敗 (方法 {method_idx + 1}, 試行 {attempt + 1}/{max_retries}): {e}")
                    
                    # プロファイルディレクトリを削除
                    if PROFILE_PATH and os.path.exists(PROFILE_PATH):
                        force_remove_directory(PROFILE_PATH)
                    
                    if attempt < max_retries - 1:
                        time.sleep(2)
                    else:
                        print(f"❌ 方法 {method_idx + 1} ({method['name']}) 失敗")
        
        print("❌ すべての起動方法が失敗しました")
        return None
        
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

def create_firefox_driver():
    """代替手段としてFirefox WebDriverを作成"""
    try:
        print("🔍 Firefox WebDriverを作成中...")
        
        from selenium.webdriver.firefox.options import Options as FirefoxOptions
        from selenium.webdriver.firefox.service import Service as FirefoxService
        
        options = FirefoxOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        # ヘッドレスモードの判定
        if os.environ.get('HEADLESS', '').lower() == 'true':
            options.add_argument('--headless')
            print("🔍 Firefoxヘッドレスモード有効")
        
        # Firefoxの実行パスを取得
        firefox_binary = get_firefox_binary_path()
        if firefox_binary:
            options.binary_location = firefox_binary
            print(f"🔍 Firefox実行パス: {firefox_binary}")
        
        driver = webdriver.Firefox(options=options)
        print("✅ Firefox WebDriver作成成功")
        
        # タイムアウト設定
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        
        # ドライバーを登録
        driver_id = register_driver(driver)
        
        print(f"✅ Firefox起動完了！ID: {driver_id[:8]}")
        return driver
        
    except Exception as e:
        print(f"❌ Firefox起動エラー: {e}")
        return None

def get_firefox_binary_path():
    """Firefoxの実行ファイルパスを取得"""
    system = platform.system()
    
    if system == "Windows":
        paths = [
            r"C:\Program Files\Mozilla Firefox\firefox.exe",
            r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe"
        ]
    elif system == "Darwin":  # macOS
        paths = [
            "/Applications/Firefox.app/Contents/MacOS/firefox",
            os.path.expanduser("~/Applications/Firefox.app/Contents/MacOS/firefox")
        ]
    else:  # Linux
        paths = [
            "/usr/bin/firefox",
            "/usr/bin/firefox-esr",
            "/snap/bin/firefox",
            "/opt/firefox/firefox"
        ]
    
    # 環境変数から取得
    env_path = os.environ.get('FIREFOX_BINARY_PATH')
    if env_path and os.path.exists(env_path):
        return env_path
    
    # 各パスをチェック
    for path in paths:
        if os.path.exists(path):
            return path
    
    # whichコマンドで探す（Unix系のみ）
    if system != "Windows":
        try:
            for cmd in ['firefox', 'firefox-esr']:
                result = subprocess.run(['which', cmd], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    return result.stdout.strip()
        except:
            pass
    
    return None

def create_browser_driver_with_fallback():
    """複数のブラウザーを試行してWebDriverを作成"""
    print("🔍 === ブラウザードライバー作成 (フォールバック付き) ===")
    
    # 1. まずChromeを試行
    chrome_driver = create_chrome_driver()
    if chrome_driver:
        return chrome_driver
    
    print("⚠️ Chrome起動に失敗しました。代替ブラウザーを試行します...")
    
    # 2. Firefoxを試行
    try:
        firefox_driver = create_firefox_driver()
        if firefox_driver:
            print("✅ Firefoxでの起動に成功しました")
            return firefox_driver
    except Exception as e:
        print(f"❌ Firefox起動エラー: {e}")
    
    # 3. すべて失敗した場合の最終手段
    print("❌ すべてのブラウザーでの起動に失敗しました")
    
    # 最終的なChrome起動の代替オプション
    print("🔍 最終手段: 最小限の設定でChromeを再試行...")
    try:
        options = webdriver.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--headless=new')
        options.add_argument('--disable-gpu')
        options.add_argument('--remote-debugging-port=9222')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        options.add_argument('--disable-javascript')
        options.add_argument('--single-process')
        options.add_argument('--no-zygote')
        options.add_argument('--disable-background-timer-throttling')
        options.add_argument('--disable-renderer-backgrounding')
        options.add_argument('--disable-backgrounding-occluded-windows')
        options.add_argument('--disable-features=site-per-process')
        
        # Chrome実行パスを設定
        if platform.system() == "Linux":
            chrome_binary = get_chrome_binary_path()
            if chrome_binary:
                options.binary_location = chrome_binary
        
        driver = webdriver.Chrome(options=options)
        print("✅ 最終手段でのChrome起動に成功")
        
        driver_id = register_driver(driver)
        return driver
        
    except Exception as e:
        print(f"❌ 最終手段のChrome起動も失敗: {e}")
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