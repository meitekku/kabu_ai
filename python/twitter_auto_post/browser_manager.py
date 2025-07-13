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
    """Chrome WebDriverを作成する"""
    try:
        print("🔍 === Chrome起動デバッグ開始 ===")
        
        options = webdriver.ChromeOptions()
        
        # 基本オプション
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
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
        
        # 一意のポート番号を生成
        port = 9222 + random.randint(0, 999)
        options.add_argument(f'--remote-debugging-port={port}')
        
        # WebDriverを作成
        driver = webdriver.Chrome(options=options)
        
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
        
        print(f"✅ Chrome起動完了！ID: {driver_id[:8]}, ポート: {port}")
        return driver
        
    except Exception as e:
        print(f"❌ Chrome起動エラー: {e}")
        return None

def cleanup_specific_driver(driver):
    """特定のWebDriverインスタンスをクリーンアップ"""
    if driver is None:
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
    """すべてのChromeDriveプロセスを強制終了"""
    try:
        print("全ChromeDriverプロセスの終了開始...")
        
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

# 終了時のクリーンアップ用
import atexit
atexit.register(kill_all_chromedrivers)