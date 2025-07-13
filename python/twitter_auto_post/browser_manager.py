import os
import sys
import time
import uuid
import random
import tempfile
import subprocess
import traceback
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("⚠️ psutil がインストールされていません。'pip install psutil' でインストールしてください。")
    print("   ChromeDriverプロセスの自動終了機能が制限されます。")

def cleanup_old_chrome_temp_dirs():
    """古いChrome一時ディレクトリをクリーンアップ"""
    try:
        temp_base = tempfile.gettempdir()
        current_time = time.time()
        cleaned_count = 0
        
        for item in os.listdir(temp_base):
            if item.startswith('chrome_twitter_'):
                item_path = os.path.join(temp_base, item)
                if os.path.isdir(item_path):
                    try:
                        stat = os.stat(item_path)
                        if current_time - stat.st_mtime > 3600:  # 3600秒 = 1時間
                            import shutil
                            shutil.rmtree(item_path)
                            cleaned_count += 1
                    except:
                        pass
        
        if cleaned_count > 0:
            print(f"古いChrome一時ディレクトリをクリーンアップ: {cleaned_count}個")
            
    except Exception as e:
        print(f"一時ディレクトリクリーンアップエラー: {e}")

def kill_all_chromedrivers():
    """すべてのChromeDriverプロセスを強制終了（緊急時・エラー時専用）"""
    try:
        print("ChromeDriverプロセスをクリーンアップ中...")
        killed_count = 0
        
        cleanup_old_chrome_temp_dirs()
        
        if PSUTIL_AVAILABLE:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    proc_name = proc.info['name'].lower()
                    cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                    
                    if ('chromedriver' in proc_name or 
                        'chromedriver' in cmdline.lower() or
                        (proc_name == 'chrome' and '--test-type' in cmdline)):
                        
                        print(f"ChromeDriverプロセス終了: PID={proc.info['pid']}, 名前={proc_name}")
                        proc.kill()
                        killed_count += 1
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
        
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
        
    except Exception as e:
        print(f"ChromeDriverクリーンアップエラー: {e}")

def create_chrome_driver():
    """Chromeドライバーを直接起動（個別プロセス管理）"""
    driver = None
    try:
        print("🔍 === Chrome起動デバッグ開始 ===")
        
        cleanup_old_chrome_temp_dirs()
        
        options = Options()
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-automation")
        options.add_argument("--no-first-run")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--lang=ja")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # 追加: プロセス終了時に確実にクリーンアップするための設定
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--headless=new")  # 新しいヘッドレスモード
        options.add_argument("--remote-debugging-pipe")  # パイプモードを使用
        
        # ユニークな一時ディレクトリとデバッグポートを設定
        unique_id = str(uuid.uuid4())[:8]
        timestamp = str(int(time.time() * 1000))
        debug_port = random.randint(9222, 9999)
        options.add_argument(f"--remote-debugging-port={debug_port}")
        
        base_temp_dir = tempfile.gettempdir()
        temp_dir = os.path.join(base_temp_dir, f'chrome_twitter_{unique_id}_{timestamp}_{debug_port}')
        
        if os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except:
                temp_dir = os.path.join(base_temp_dir, f'chrome_twitter_{uuid.uuid4().hex[:12]}_{int(time.time() * 1000000)}')
        
        os.makedirs(temp_dir, exist_ok=True)
        options.add_argument(f"--user-data-dir={temp_dir}")
        
        # Chrome binary の設定
        chrome_binary = os.getenv('CHROME_BINARY_PATH')
        if chrome_binary and os.path.exists(chrome_binary):
            options.binary_location = chrome_binary
        
        service = Service(ChromeDriverManager().install())
        
        driver = webdriver.Chrome(service=service, options=options)
        driver.implicitly_wait(3)
        driver.set_window_size(1200, 800)
        
        driver._unique_id = unique_id
        driver._debug_port = debug_port
        driver._temp_dir = temp_dir
        
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print(f"✅ Chrome起動完了！ID: {unique_id}, ポート: {debug_port}")
        return driver
        
    except Exception as e:
        print(f"❌ Chromeの起動に失敗: {e}")
        print(f"🔍 エラーの詳細: {traceback.format_exc()}")
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
            
            try:
                driver.quit()
            except:
                pass
            
            if hasattr(driver, '_temp_dir') and os.path.exists(driver._temp_dir):
                try:
                    import shutil
                    shutil.rmtree(driver._temp_dir)
                except Exception as e:
                    print(f"一時ディレクトリ削除失敗: {e}")
            
            if hasattr(driver, '_debug_port') and PSUTIL_AVAILABLE:
                try:
                    for proc in psutil.process_iter(['pid', 'name', 'connections']):
                        try:
                            for conn in proc.info['connections'] or []:
                                if conn.laddr.port == driver._debug_port:
                                    print(f"ポート{driver._debug_port}使用プロセス終了: PID={proc.pid}")
                                    proc.kill()
                                    break
                        except:
                            continue
                except Exception as e:
                    print(f"ポート特定プロセス終了失敗: {e}")
        else:
            try:
                driver.quit()
            except:
                pass
                
    except Exception as e:
        print(f"個別クリーンアップエラー: {e}")
        try:
            driver.quit()
        except:
            pass 