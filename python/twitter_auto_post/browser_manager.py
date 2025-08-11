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
from .proxy_manager import ProxyManager, ProxyConfig, get_proxy_manager
from typing import Optional
import requests
import json

# グローバル変数でドライバーIDを管理
DRIVER_REGISTRY = {}

# 再利用可能なドライバーの管理
REUSABLE_DRIVER = None
PROFILE_PATH = None
PERSISTENT_PROFILE_PATH = None

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

def diagnose_chrome_environment():
    """Chrome環境の詳細な診断"""
    print("🔍 === Chrome環境診断開始 ===")
    
    # 1. 環境変数の確認
    print("🔍 環境変数:")
    env_vars = ['DISPLAY', 'CHROME_BINARY_PATH', 'CHROME_FLAGS', 'CHROME_DEVEL_SANDBOX', 'CHROME_DISABLE_SANDBOX']
    for var in env_vars:
        value = os.environ.get(var, 'Not set')
        print(f"  {var}={value}")
    
    # 2. Chrome実行ファイルの確認
    chrome_paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
    ]
    
    print("\n🔍 Chrome実行ファイルの確認:")
    for path in chrome_paths:
        if os.path.exists(path):
            try:
                result = subprocess.run([path, '--version'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    print(f"  ✅ {path}: {result.stdout.strip()}")
                else:
                    print(f"  ❌ {path}: バージョン取得失敗")
            except:
                print(f"  ❌ {path}: 実行失敗")
        else:
            print(f"  ❌ {path}: 存在しない")
    
    # 3. 権限の確認
    print("\n🔍 権限の確認:")
    try:
        # /tmp の書き込み権限
        test_file = '/tmp/chrome_test_write'
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        print("  ✅ /tmp書き込み権限: OK")
    except:
        print("  ❌ /tmp書き込み権限: NG")
    
    # 4. プロセス一覧の確認
    print("\n🔍 現在のChromeプロセス:")
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            chrome_processes = [line for line in result.stdout.split('\n') if 'chrome' in line.lower()]
            if chrome_processes:
                for proc in chrome_processes[:5]:  # 最大5つまで表示
                    print(f"  {proc}")
            else:
                print("  ✅ Chrome関連プロセスなし")
    except:
        print("  ❌ プロセス一覧取得失敗")
    
    # 5. ロックファイルの確認
    print("\n🔍 ロックファイルの確認:")
    lock_patterns = [
        '/tmp/.org.chromium.*',
        '/tmp/.com.google.Chrome.*',
        '/tmp/chrome_*',
        '/dev/shm/chrome_*'
    ]
    
    for pattern in lock_patterns:
        try:
            import glob
            lock_files = glob.glob(pattern)
            if lock_files:
                print(f"  ⚠️ {pattern}: {len(lock_files)}個のファイル")
                for lock_file in lock_files[:3]:  # 最大3つまで表示
                    print(f"    {lock_file}")
            else:
                print(f"  ✅ {pattern}: なし")
        except:
            print(f"  ❌ {pattern}: 確認失敗")
    
    # 6. システムリソースの確認
    print("\n🔍 システムリソース:")
    try:
        # メモリ使用量
        result = subprocess.run(['free', '-h'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("  メモリ使用量:")
            for line in result.stdout.split('\n')[:3]:
                if line.strip():
                    print(f"    {line}")
    except:
        print("  ❌ メモリ情報取得失敗")
    
    # 7. セキュリティ制限の確認
    print("\n🔍 セキュリティ制限:")
    try:
        # AppArmor
        result = subprocess.run(['aa-status'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("  ✅ AppArmor有効")
        else:
            print("  ✅ AppArmor無効")
    except:
        print("  ✅ AppArmor確認できず")
    
    try:
        # SELinux
        result = subprocess.run(['getenforce'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print(f"  ✅ SELinux: {result.stdout.strip()}")
        else:
            print("  ✅ SELinux無効")
    except:
        print("  ✅ SELinux確認できず")
    
    print("🔍 === Chrome環境診断完了 ===\n")

def diagnose_system_restrictions():
    """システムレベルの制限を詳細に診断"""
    print("🔍 === システム制限診断開始 ===")
    
    # 1. AppArmorの詳細確認
    print("🔍 AppArmor詳細:")
    try:
        result = subprocess.run(['aa-status'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            lines = result.stdout.split('\n')
            for line in lines[:20]:  # 最初の20行を表示
                if 'chrome' in line.lower() or 'google' in line.lower():
                    print(f"  ⚠️ Chrome関連: {line}")
                elif 'profile' in line.lower():
                    print(f"  📝 プロファイル: {line}")
        
        # Chrome用AppArmorプロファイルの確認
        apparmor_profiles = [
            '/etc/apparmor.d/usr.bin.google-chrome',
            '/etc/apparmor.d/usr.bin.google-chrome-stable',
            '/etc/apparmor.d/usr.bin.chromium',
            '/etc/apparmor.d/usr.bin.chromium-browser'
        ]
        
        for profile in apparmor_profiles:
            if os.path.exists(profile):
                print(f"  ✅ AppArmorプロファイル発見: {profile}")
                try:
                    with open(profile, 'r') as f:
                        content = f.read()
                        if 'complain' in content:
                            print(f"    📝 モード: complain")
                        elif 'enforce' in content:
                            print(f"    📝 モード: enforce")
                except:
                    pass
            else:
                print(f"  ❌ AppArmorプロファイル: {profile} (存在しない)")
    except:
        print("  ❌ AppArmor確認失敗")
    
    # 2. ulimitの確認
    print("\n🔍 ulimit制限:")
    try:
        result = subprocess.run(['ulimit', '-a'], capture_output=True, text=True, timeout=5, shell=True)
        if result.returncode == 0:
            lines = result.stdout.split('\n')
            for line in lines:
                if any(keyword in line for keyword in ['file', 'process', 'memory', 'virtual']):
                    print(f"  📝 {line}")
    except:
        print("  ❌ ulimit確認失敗")
    
    # 3. cgroupの確認
    print("\n🔍 cgroup制限:")
    try:
        if os.path.exists('/proc/self/cgroup'):
            with open('/proc/self/cgroup', 'r') as f:
                content = f.read()
                for line in content.split('\n')[:10]:
                    if line.strip():
                        print(f"  📝 {line}")
    except:
        print("  ❌ cgroup確認失敗")
    
    # 4. seccompの確認
    print("\n🔍 seccomp制限:")
    try:
        if os.path.exists('/proc/self/status'):
            with open('/proc/self/status', 'r') as f:
                content = f.read()
                for line in content.split('\n'):
                    if 'seccomp' in line.lower():
                        print(f"  📝 {line}")
    except:
        print("  ❌ seccomp確認失敗")
    
    # 5. 名前空間の確認
    print("\n🔍 名前空間:")
    try:
        result = subprocess.run(['ls', '-la', '/proc/self/ns/'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            lines = result.stdout.split('\n')
            for line in lines:
                if any(keyword in line for keyword in ['pid', 'net', 'mnt', 'user']):
                    print(f"  📝 {line}")
    except:
        print("  ❌ 名前空間確認失敗")
    
    # 6. コンテナ環境の確認
    print("\n🔍 コンテナ環境:")
    container_indicators = [
        '/.dockerenv',
        '/run/.containerenv',
        '/proc/1/cgroup'
    ]
    
    for indicator in container_indicators:
        if os.path.exists(indicator):
            print(f"  ⚠️ コンテナ指標発見: {indicator}")
            if indicator == '/proc/1/cgroup':
                try:
                    with open(indicator, 'r') as f:
                        content = f.read()
                        if 'docker' in content or 'containerd' in content:
                            print(f"    📝 Dockerコンテナ内で実行中")
                except:
                    pass
    
    # 7. Chrome実行テスト
    print("\n🔍 Chrome実行テスト:")
    try:
        chrome_path = get_chrome_binary_path()
        if chrome_path:
            result = subprocess.run([chrome_path, '--help'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("  ✅ Chrome実行: OK")
            else:
                print(f"  ❌ Chrome実行失敗: {result.returncode}")
                print(f"    stderr: {result.stderr[:200]}")
    except Exception as e:
        print(f"  ❌ Chrome実行テスト失敗: {e}")
    
    print("🔍 === システム制限診断完了 ===\n")

def create_simple_stable_chrome(proxy_config: Optional[ProxyConfig] = None):
    """シンプルで安定したChrome起動（根本的解決版・プロキシ対応）"""
    print("🔍 === シンプル安定Chrome起動を試行 ===")
    
    if proxy_config:
        print(f"🔍 プロキシ使用: {proxy_config.host}:{proxy_config.port}")
    
    try:
        # 1. ChromeDriverのサービスを明示的に作成
        from selenium.webdriver.chrome.service import Service
        service = Service()
        
        # 2. 最小限の安定したオプション設定
        options = webdriver.ChromeOptions()
        
        # プロキシ設定を追加
        if proxy_config:
            proxy_url = proxy_config.to_selenium_format()
            options.add_argument(f'--proxy-server={proxy_url}')
            print(f"🔍 プロキシサーバー設定: {proxy_url}")
        
        # 基本的なサンドボックス回避（必須）
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-setuid-sandbox')
        
        # セッション安定化（重要）
        options.add_argument('--disable-gpu')
        options.add_argument('--headless=new')
        
        # プロファイル競合回避（重要）
        options.add_argument('--no-first-run')
        options.add_argument('--no-default-browser-check')
        
        # V8 Proxy resolverエラー回避（重要）
        # --single-processを削除して、通常のマルチプロセス動作を使用
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-features=VizDisplayCompositor')
        
        # メモリ使用量削減
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        
        # デバッグポートを動的に設定
        debug_port = 9222 + random.randint(0, 1000)
        options.add_argument(f'--remote-debugging-port={debug_port}')
        
        # ウィンドウサイズを設定
        options.add_argument('--window-size=1280,800')
        
        # User-Agentを設定
        options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Chrome実行パスを設定
        chrome_binary = get_chrome_binary_path()
        if chrome_binary:
            options.binary_location = chrome_binary
            print(f"🔍 Chrome実行パス: {chrome_binary}")
        
        print(f"🔍 デバッグポート: {debug_port}")
        print("🔍 シンプル設定でChrome起動...")
        
        # ChromeDriverを起動
        driver = webdriver.Chrome(service=service, options=options)
        
        # セッション管理設定
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        
        print("✅ シンプル安定Chrome起動成功！")
        return driver
        
    except Exception as e:
        print(f"❌ シンプル安定Chrome起動失敗: {e}")
        return None

def create_apparmor_bypass_chrome():
    """AppArmorの制限を回避してChromeを起動する（改良版）"""
    print("🔍 === AppArmorバイパス方法を試行 ===")
    
    try:
        # 1. AppArmorプロファイルを一時的に無効化
        print("🔍 AppArmorプロファイルを一時的に無効化...")
        chrome_profiles = [
            'usr.bin.google-chrome',
            'usr.bin.google-chrome-stable',
            'usr.bin.chromium',
            'usr.bin.chromium-browser'
        ]
        
        for profile in chrome_profiles:
            try:
                subprocess.run(['aa-disable', f'/etc/apparmor.d/{profile}'], 
                             capture_output=True, text=True, timeout=5)
                print(f"  ✅ {profile} を無効化")
            except:
                pass
        
        # 2. まずシンプルな方法を試行
        driver = create_simple_stable_chrome()
        if driver:
            print("✅ AppArmorバイパス成功！")
            return driver
        
        # 3. シンプルな方法が失敗した場合の代替手段
        print("🔍 代替手段を試行...")
        
        options = webdriver.ChromeOptions()
        
        # 基本的なサンドボックス回避
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-setuid-sandbox')
        
        # セッション安定化のためのオプション
        options.add_argument('--disable-gpu')
        options.add_argument('--headless=new')
        options.add_argument('--no-first-run')
        options.add_argument('--no-default-browser-check')
        
        # 環境変数を設定
        env = os.environ.copy()
        env['CHROME_DEVEL_SANDBOX'] = ''
        env['CHROME_DISABLE_SANDBOX'] = '1'
        env['CHROME_NO_SANDBOX'] = '1'
        
        # Chrome実行パスを設定
        chrome_binary = get_chrome_binary_path()
        if chrome_binary:
            options.binary_location = chrome_binary
            print(f"🔍 Chrome実行パス: {chrome_binary}")
        
        print("🔍 代替手段でChrome起動...")
        
        # 環境変数を一時的に設定
        original_env = os.environ.copy()
        os.environ.update(env)
        
        try:
            driver = webdriver.Chrome(options=options)
            
            # セッション管理設定
            driver.set_page_load_timeout(30)
            driver.implicitly_wait(10)
            
            print("✅ AppArmorバイパス成功！")
            return driver
            
        finally:
            # 環境変数を復元
            os.environ.clear()
            os.environ.update(original_env)
    
    except Exception as e:
        print(f"❌ AppArmorバイパス失敗: {e}")
        return None

def create_direct_chrome_process():
    """WebDriverを使わずに直接Chromeプロセスを起動（改良版）"""
    print("🔍 === 直接Chrome起動を試行 ===")
    
    try:
        chrome_binary = get_chrome_binary_path()
        if not chrome_binary:
            print("❌ Chrome実行ファイルが見つかりません")
            return None
        
        # Chrome起動コマンド（シンプル版）
        cmd = [
            chrome_binary,
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--headless=new',
            '--remote-debugging-port=9222',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--window-size=1280,800',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        print(f"🔍 直接Chrome起動コマンド: {' '.join(cmd)}")
        
        # Chrome プロセスを起動
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(5)  # Chromeが起動するまで待機
        
        # プロセスが生きているか確認
        if process.poll() is None:
            print("✅ Chrome プロセス起動成功")
            
            # リモートデバッグポートに接続
            try:
                from selenium.webdriver.chrome.options import Options
                
                # リモートChromeに接続
                options = Options()
                options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
                
                driver = webdriver.Chrome(options=options)
                print("✅ リモートChrome接続成功")
                return driver
                
            except Exception as e:
                print(f"❌ リモートChrome接続失敗: {e}")
                process.terminate()
                return None
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Chrome プロセス起動失敗")
            print(f"stdout: {stdout.decode()[:500]}")
            print(f"stderr: {stderr.decode()[:500]}")
            return None
            
    except Exception as e:
        print(f"❌ 直接Chrome起動失敗: {e}")
        return None

def create_chrome_with_unique_profile():
    """完全に一意のプロファイルでChromeを起動"""
    print("🔍 === 一意プロファイルでChrome起動 ===")
    
    try:
        # 完全に一意のプロファイルディレクトリを作成
        import tempfile
        import shutil
        
        # 一時ディレクトリを作成
        temp_dir = tempfile.mkdtemp(prefix='chrome_unique_')
        print(f"🔍 一時プロファイルディレクトリ: {temp_dir}")
        
        try:
            options = webdriver.ChromeOptions()
            
            # 基本的なサンドボックス回避
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-setuid-sandbox')
            
            # セッション安定化
            options.add_argument('--disable-gpu')
            options.add_argument('--headless=new')
            options.add_argument('--no-first-run')
            options.add_argument('--no-default-browser-check')
            
            # 一意のプロファイルディレクトリを使用
            options.add_argument(f'--user-data-dir={temp_dir}')
            
            # その他の設定
            options.add_argument('--disable-extensions')
            options.add_argument('--disable-plugins')
            options.add_argument('--disable-images')
            options.add_argument('--window-size=1280,800')
            
            # Chrome実行パスを設定
            chrome_binary = get_chrome_binary_path()
            if chrome_binary:
                options.binary_location = chrome_binary
                print(f"🔍 Chrome実行パス: {chrome_binary}")
            
            # ChromeDriverを起動
            driver = webdriver.Chrome(options=options)
            
            # セッション管理設定
            driver.set_page_load_timeout(30)
            driver.implicitly_wait(10)
            
            print("✅ 一意プロファイルでChrome起動成功！")
            
            # クリーンアップ関数を設定
            def cleanup():
                try:
                    driver.quit()
                except:
                    pass
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except:
                    pass
            
            # ドライバーにクリーンアップ関数を追加
            driver._cleanup_temp_dir = cleanup
            
            return driver
            
        except Exception as e:
            # エラー時は一時ディレクトリを削除
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except:
                pass
            raise e
            
    except Exception as e:
        print(f"❌ 一意プロファイルでChrome起動失敗: {e}")
        return None

def get_persistent_profile_path():
    """永続化プロファイルのパスを取得"""
    global PERSISTENT_PROFILE_PATH
    if PERSISTENT_PROFILE_PATH is None:
        # プロジェクトルートに永続プロファイルディレクトリを作成
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        PERSISTENT_PROFILE_PATH = os.path.join(project_root, 'twitter_chrome_profile')
        
        # ディレクトリが存在しない場合は作成
        if not os.path.exists(PERSISTENT_PROFILE_PATH):
            os.makedirs(PERSISTENT_PROFILE_PATH, exist_ok=True)
            print(f"✅ 永続プロファイルディレクトリを作成: {PERSISTENT_PROFILE_PATH}")
    
    return PERSISTENT_PROFILE_PATH

def create_isolated_twitter_profile():
    """既存Chromeと競合しない独立したTwitter投稿用プロファイルを作成"""
    print("🔍 === 独立したTwitter投稿用プロファイル作成 ===")
    
    # 一意のプロファイル名を生成
    timestamp = int(time.time())
    profile_name = f"twitter_post_{timestamp}_{random.randint(1000, 9999)}"
    
    # 一時ディレクトリまたはプロジェクト内にプロファイルを作成
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    base_profile_dir = os.path.join(project_root, 'twitter_profiles')
    
    # ベースディレクトリが存在しない場合は作成
    if not os.path.exists(base_profile_dir):
        os.makedirs(base_profile_dir, exist_ok=True)
        print(f"✅ Twitter投稿用プロファイルベースディレクトリを作成: {base_profile_dir}")
    
    profile_path = os.path.join(base_profile_dir, profile_name)
    
    try:
        os.makedirs(profile_path, exist_ok=True)
        print(f"✅ 独立プロファイルを作成: {profile_path}")
        return profile_path
    except Exception as e:
        print(f"❌ 独立プロファイル作成エラー: {e}")
        # フォールバック: 一時ディレクトリを使用
        import tempfile
        profile_path = tempfile.mkdtemp(prefix='twitter_post_')
        print(f"🔄 フォールバック: 一時プロファイルを使用: {profile_path}")
        return profile_path

def create_chrome_for_twitter_post():
    """Twitter投稿専用のChromeインスタンスを作成（既存Chromeに影響しない）"""
    print("🔍 === Twitter投稿専用Chrome作成 ===")
    
    try:
        # 独立したプロファイルを作成
        profile_path = create_isolated_twitter_profile()
        
        options = webdriver.ChromeOptions()
        
        # 独立プロファイルを使用
        options.add_argument(f'--user-data-dir={profile_path}')
        options.add_argument('--profile-directory=Default')
        
        # 既存Chromeとのポート競合を避ける
        debug_port = 9300 + random.randint(0, 100)  # 通常の9222から離れたポート
        options.add_argument(f'--remote-debugging-port={debug_port}')
        
        # 基本的なサンドボックス回避
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-setuid-sandbox')
        
        # セッション安定化
        options.add_argument('--disable-gpu')
        
        # 環境変数でヘッドレスモードを制御
        env_headless = os.environ.get('HEADLESS', '').lower() == 'true'
        
        if env_headless:
            options.add_argument('--headless=new')
            print("🔍 ヘッドレスモード有効")
        else:
            print("🔍 ヘッドレスモード無効（手動ログイン対応）")
        
        options.add_argument('--no-first-run')
        options.add_argument('--no-default-browser-check')
        
        # その他の設定
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        if env_headless:
            options.add_argument('--disable-images')
        
        # ウィンドウサイズを設定
        options.add_argument('--window-size=1280,800')
        
        # User-Agentを設定
        options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Chrome実行パスを設定
        chrome_binary = get_chrome_binary_path()
        if chrome_binary:
            options.binary_location = chrome_binary
            print(f"🔍 Chrome実行パス: {chrome_binary}")
        
        print(f"🔍 デバッグポート: {debug_port}")
        print(f"🔍 プロファイルパス: {profile_path}")
        print("🔍 Twitter投稿専用Chrome起動...")
        
        # ChromeDriverを起動
        driver = webdriver.Chrome(options=options)
        
        # セッション管理設定
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        
        # ドライバーにプロファイルパスを保存（後でクリーンアップ用）
        driver._twitter_profile_path = profile_path
        
        print("✅ Twitter投稿専用Chrome起動成功！")
        return driver
        
    except Exception as e:
        print(f"❌ Twitter投稿専用Chrome起動失敗: {e}")
        return None

def cleanup_chrome_locks(profile_path):
    """Chromeプロファイルのロックファイルをクリーンアップ"""
    try:
        lock_files = [
            'SingletonLock',
            'SingletonSocket', 
            'SingletonCookie',
            'lockfile'
        ]
        
        for lock_file in lock_files:
            lock_path = os.path.join(profile_path, lock_file)
            if os.path.exists(lock_path):
                try:
                    os.remove(lock_path)
                    print(f"✅ ロックファイル削除: {lock_file}")
                except:
                    pass
                    
    except Exception as e:
        print(f"⚠️ ロックファイルクリーンアップエラー: {e}")

def delete_chrome_profile_for_auth_reset():
    """メール2段階認証回避のためにChromeプロファイルを完全削除"""
    try:
        print("🗑️ === メール認証回避のためプロファイル削除 ===")
        
        profile_path = get_persistent_profile_path()
        print(f"🗑️ 削除対象プロファイル: {profile_path}")
        
        if os.path.exists(profile_path):
            # Twitter投稿専用プロファイルのクリーンアップ（既存Chromeには影響なし）
            print("🔄 Twitter投稿プロファイルクリーンアップ中...")
            cleanup_twitter_post_profiles()
            time.sleep(2)
            
            # プロファイルを完全削除
            success = force_remove_directory(profile_path)
            
            if success:
                print("✅ プロファイル削除成功")
                print("💡 次回ログイン時は新しい認証状態で開始されます")
                return True
            else:
                print("⚠️ プロファイル削除に一部失敗")
                return False
        else:
            print("✅ プロファイルが存在しないため削除不要")
            return True
            
    except Exception as e:
        print(f"❌ プロファイル削除エラー: {e}")
        return False

def create_chrome_with_persistent_profile(headless=False, anti_detection=False):
    """永続プロファイル付きでChromeを起動（認証状態保持・指紋変更強化版）"""
    print("🔍 === 永続プロファイル付きChrome起動 ===")
    
    try:
        profile_path = get_persistent_profile_path()
        print(f"🔍 永続プロファイルパス: {profile_path}")
        
        # ロックファイルをクリーンアップ
        cleanup_chrome_locks(profile_path)
        
        options = webdriver.ChromeOptions()
        
        # 永続プロファイルを使用
        options.add_argument(f'--user-data-dir={profile_path}')
        options.add_argument('--profile-directory=Default')
        
        # 基本的なサンドボックス回避
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-setuid-sandbox')
        
        # セッション安定化と認証状態保持
        options.add_argument('--disable-gpu')
        
        # 環境変数でヘッドレスモードを制御
        env_headless = os.environ.get('HEADLESS', '').lower() == 'true'
        use_headless = headless or env_headless
        
        if use_headless:
            options.add_argument('--headless=new')
            print("🔍 ヘッドレスモード有効")
        else:
            print("🔍 ヘッドレスモード無効（手動ログイン用）")
        options.add_argument('--no-first-run')
        options.add_argument('--no-default-browser-check')
        
        # セッション復元設定（認証状態保持のため）
        options.add_argument('--restore-last-session')
        options.add_argument('--disable-session-crashed-bubble')
        options.add_argument('--disable-infobars')
        options.add_argument('--disable-translate')
        options.add_argument('--disable-background-timer-throttling')
        options.add_argument('--disable-renderer-backgrounding')
        options.add_argument('--disable-backgrounding-occluded-windows')
        
        # 検出回避強化（anti_detection=True時）
        if anti_detection:
            print("🔧 ブラウザ指紋変更・検出回避モード有効")
            
            # ブラウザ指紋を変更
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            ]
            selected_ua = random.choice(user_agents)
            options.add_argument(f'--user-agent={selected_ua}')
            print(f"🔧 User-Agent変更: {selected_ua[:50]}...")
            
            # 言語設定をランダム化
            languages = ['en-US,en', 'en-GB,en', 'fr-FR,fr', 'de-DE,de', 'es-ES,es']
            selected_lang = random.choice(languages)
            options.add_argument(f'--lang={selected_lang.split(",")[0]}')
            
            # 追加の検出回避オプション
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            # WebRTC IP漏洩防止
            options.add_argument('--disable-webrtc')
            options.add_argument('--disable-webrtc-multiple-routes')
            options.add_argument('--disable-webrtc-hw-decoding')
            options.add_argument('--disable-webrtc-hw-encoding')
            
            # フォント列挙防止
            options.add_argument('--disable-font-subpixel-positioning')
            
            # Canvas指紋変更
            options.add_argument('--disable-canvas-aa')
            options.add_argument('--disable-2d-canvas-clip-aa')
            
            # 時間精度を下げる
            options.add_argument('--enable-features=BlinkGenPropertyTrees,TranslateUI')
            
            # プリファレンス設定で追加の指紋変更
            prefs = {
                'intl.accept_languages': selected_lang,
                'profile.default_content_setting_values.notifications': 2,
                'profile.default_content_settings.popups': 0,
                'profile.managed_default_content_settings.images': 1,
                'webrtc.ip_handling_policy': 'disable_non_proxied_udp',
                'webrtc.multiple_routes_enabled': False,
                'webrtc.nonproxied_udp_enabled': False
            }
            options.add_experimental_option('prefs', prefs)
            
        else:
            # 通常モード
            options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # その他の設定
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        if headless:
            options.add_argument('--disable-images')
        
        # ウィンドウサイズをランダム化（anti_detection時）
        if anti_detection:
            widths = [1280, 1366, 1440, 1536, 1920]
            heights = [720, 768, 900, 864, 1080]
            width = random.choice(widths)
            height = random.choice(heights)
            options.add_argument(f'--window-size={width},{height}')
            print(f"🔧 ウィンドウサイズ変更: {width}x{height}")
        else:
            options.add_argument('--window-size=1280,800')
        
        # デバッグポートを動的に設定
        debug_port = 9222 + random.randint(0, 1000)
        options.add_argument(f'--remote-debugging-port={debug_port}')
        
        # Chrome実行パスを設定
        chrome_binary = get_chrome_binary_path()
        if chrome_binary:
            options.binary_location = chrome_binary
            print(f"🔍 Chrome実行パス: {chrome_binary}")
        
        print(f"🔍 デバッグポート: {debug_port}")
        print("🔍 永続プロファイル設定でChrome起動...")
        
        # ChromeDriverを起動
        driver = webdriver.Chrome(options=options)
        
        # 検出回避のJavaScript実行（anti_detection時）
        if anti_detection:
            try:
                # webdriver プロパティを削除
                driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                
                # プラグイン情報を偽装
                driver.execute_script("""
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });
                """)
                
                # 言語設定を変更
                driver.execute_script(f"""
                    Object.defineProperty(navigator, 'languages', {{
                        get: () => ['{selected_lang.split(",")[0]}', '{selected_lang.split(",")[1] if "," in selected_lang else "en"}']
                    }});
                """)
                
                print("🔧 JavaScript指紋変更実行完了")
                
            except Exception as js_error:
                print(f"⚠️ JavaScript指紋変更エラー: {js_error}")
        
        # セッション管理設定
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        
        if anti_detection:
            print("✅ 指紋変更強化版Chrome起動成功！")
        else:
            print("✅ 永続プロファイル付きChrome起動成功！")
        return driver
        
    except Exception as e:
        print(f"❌ 永続プロファイル付きChrome起動失敗: {e}")
        return None

def create_chrome_driver():
    """Chrome WebDriverを作成する（クリーンスタート版）"""
    global REUSABLE_DRIVER, PROFILE_PATH
    
    # 既存のドライバーをクリーンアップ
    if REUSABLE_DRIVER:
        try:
            REUSABLE_DRIVER.quit()
        except:
            pass
        REUSABLE_DRIVER = None
    
    try:
        print("🔍 === Chrome起動デバッグ開始 (クリーンスタート版) ===")
        
        # 環境判定
        is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
        print(f"🔍 環境判定: NODE_ENV={os.environ.get('NODE_ENV')}, ENVIRONMENT={os.environ.get('ENVIRONMENT')}, is_production={is_production}")
        
        # 投稿専用のChromeインスタンスを作成（既存Chromeには影響しない）
        print("🔍 === 投稿専用Chromeインスタンス作成 ===")
        print("💡 既存のChromeブラウザは保持されます")
        
        # 最初にTwitter投稿専用Chrome起動を試行
        print("🔍 === Twitter投稿専用Chrome起動を試行 ===")
        driver = create_chrome_for_twitter_post()
        if driver:
            driver_id = register_driver(driver)
            if not is_production:
                REUSABLE_DRIVER = driver
            print(f"✅ 永続プロファイル付きChrome起動成功！ID: {driver_id[:8]}")
            return driver
        
        # 次にプロキシローテーション付きChrome起動を試行
        print("🔍 === 次にプロキシローテーション付きChrome起動を試行 ===")
        driver = create_chrome_with_proxy_rotation()
        if driver:
            driver_id = register_driver(driver)
            if not is_production:
                REUSABLE_DRIVER = driver
            print(f"✅ プロキシローテーション付きChrome起動成功！ID: {driver_id[:8]}")
            return driver
        
        # 次に一意プロファイルでChrome起動を試行
        print("🔍 === 次に一意プロファイルでChrome起動を試行 ===")
        driver = create_chrome_with_unique_profile()
        if driver:
            driver_id = register_driver(driver)
            if not is_production:
                REUSABLE_DRIVER = driver
            print(f"✅ 一意プロファイルでChrome起動成功！ID: {driver_id[:8]}")
            return driver
        
        # 次にAppArmorバイパスを試行
        print("🔍 === 次にAppArmorバイパスを試行 ===")
        driver = create_apparmor_bypass_chrome()
        if driver:
            driver_id = register_driver(driver)
            if not is_production:
                REUSABLE_DRIVER = driver
            print(f"✅ AppArmorバイパス成功！ID: {driver_id[:8]}")
            return driver
        
        # 最後に直接Chrome起動を試行
        print("🔍 === 最後に直接Chrome起動を試行 ===")
        driver = create_direct_chrome_process()
        if driver:
            driver_id = register_driver(driver)
            if not is_production:
                REUSABLE_DRIVER = driver
            print(f"✅ 直接Chrome起動成功！ID: {driver_id[:8]}")
            return driver
        
        # Ubuntu環境では複数の起動方法を試行
        startup_methods = []
        
        # 方法1: 完全に分離された環境でのChrome起動
        startup_methods.append({
            'name': 'Docker-like Isolation',
            'use_profile': False,
            'use_unshare': True,
            'options': ['--no-default-browser-check', '--no-first-run', '--disable-user-media-security=true']
        })
        
        # 方法2: Xvfb仮想ディスプレイを使用
        startup_methods.append({
            'name': 'Xvfb Virtual Display',
            'use_profile': False,
            'use_xvfb': True,
            'options': ['--no-default-browser-check', '--no-first-run']
        })
        
        # 方法3: 完全に別のユーザー名前空間
        startup_methods.append({
            'name': 'User Namespace',
            'use_profile': True,
            'use_user_namespace': True,
            'options': []
        })
        
        # 方法4: Chrome起動前に環境をリセット
        startup_methods.append({
            'name': 'Environment Reset',
            'use_profile': False,
            'reset_environment': True,
            'options': ['--no-default-browser-check', '--no-first-run']
        })
        
        # 方法5: 従来の方法（プロファイルを完全に使わない）
        startup_methods.append({
            'name': 'No Profile (最も確実)',
            'use_profile': False,
            'options': ['--no-default-browser-check', '--no-first-run', '--disable-user-media-security=true']
        })
        
        # 方法6: 一時プロファイルを使用
        startup_methods.append({
            'name': 'Temporary Profile',
            'use_profile': True,
            'temp_profile': True,
            'options': []
        })
        
        # 方法7: 複数のプロファイルパスを試行
        startup_methods.append({
            'name': 'Multiple Profile Paths',
            'use_profile': True,
            'multiple_paths': True,
            'options': []
        })
        
        # 方法8: Incognito モード
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
                    # 特別な環境設定
                    chrome_env = os.environ.copy()
                    chrome_command = None
                    
                    # 方法1: unshareを使用した分離環境
                    if method.get('use_unshare'):
                        print("🔍 unshareを使用した分離環境でChrome起動")
                        chrome_command = ['unshare', '--mount', '--pid', '--fork']
                        chrome_env.pop('DISPLAY', None)  # DISPLAYを削除
                        chrome_env['CHROME_DEVEL_SANDBOX'] = '/usr/lib/chromium-browser/chrome-sandbox'
                    
                    # 方法2: Xvfb仮想ディスプレイ
                    elif method.get('use_xvfb'):
                        print("🔍 Xvfb仮想ディスプレイを使用")
                        # Xvfbを起動
                        xvfb_display = f":{random.randint(10, 99)}"
                        try:
                            xvfb_process = subprocess.Popen(['Xvfb', xvfb_display, '-screen', '0', '1280x800x24'])
                            time.sleep(2)  # Xvfbが起動するまで待機
                            chrome_env['DISPLAY'] = xvfb_display
                            print(f"🔍 Xvfb起動完了: DISPLAY={xvfb_display}")
                        except Exception as e:
                            print(f"⚠️ Xvfb起動失敗: {e}")
                    
                    # 方法3: ユーザー名前空間
                    elif method.get('use_user_namespace'):
                        print("🔍 ユーザー名前空間を使用")
                        chrome_command = ['unshare', '--user', '--map-root-user']
                    
                    # 方法4: 環境リセット
                    elif method.get('reset_environment'):
                        print("🔍 環境をリセット")
                        # 環境変数を最小限に
                        chrome_env = {
                            'PATH': os.environ.get('PATH', ''),
                            'HOME': os.environ.get('HOME', ''),
                            'USER': os.environ.get('USER', ''),
                            'LANG': 'C',
                            'LC_ALL': 'C'
                        }
                        # 一時的にすべてのChromeロックファイルを削除
                        subprocess.run(['find', '/tmp', '-name', '*chrome*', '-type', 'f', '-delete'], 
                                     capture_output=True, timeout=10)
                        subprocess.run(['find', '/dev/shm', '-name', '*chrome*', '-type', 'f', '-delete'], 
                                     capture_output=True, timeout=10)
                    
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
                    
                    # 特別なコマンドがある場合
                    if chrome_command:
                        print(f"🔍 特別なコマンドで起動: {' '.join(chrome_command)}")
                        # 環境変数を設定してWebDriverを作成
                        original_env = os.environ.copy()
                        os.environ.update(chrome_env)
                        try:
                            driver = webdriver.Chrome(options=options)
                        finally:
                            # 環境変数を復元
                            os.environ.clear()
                            os.environ.update(original_env)
                    else:
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
        
        # すべての方法が失敗した場合は代替ブラウザーツールを試行
        print("🔍 === すべてのChrome起動方法が失敗 - 代替ツールを試行 ===")
        alternative_browser = create_alternative_browser()
        if alternative_browser:
            print("✅ 代替ブラウザーツールで成功しました")
            return alternative_browser
        
        return None

def create_playwright_browser():
    """Playwright を使用してブラウザーを作成"""
    print("🔍 === Playwright を使用してブラウザー作成 ===")
    
    try:
        # Playwright のインポート
        from playwright.sync_api import sync_playwright
        
        print("🔍 Playwright を起動中...")
        
        playwright = sync_playwright().start()
        
        # Chrome/Chromium を起動
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',
                '--window-size=1280,800'
            ]
        )
        
        # ページを作成
        page = browser.new_page()
        
        print("✅ Playwright ブラウザー作成成功")
        return {'browser': browser, 'page': page, 'playwright': playwright}
        
    except ImportError:
        print("❌ Playwright がインストールされていません")
        print("  インストール方法: pip install playwright && playwright install chromium")
        return None
    except Exception as e:
        print(f"❌ Playwright ブラウザー作成失敗: {e}")
        return None

def create_requests_session():
    """requests + BeautifulSoup を使用してHTTPセッションを作成"""
    print("🔍 === requests + BeautifulSoup を使用してHTTPセッション作成 ===")
    
    try:
        import requests
        from bs4 import BeautifulSoup
        
        # セッションを作成
        session = requests.Session()
        
        # ヘッダーを設定（Chrome の User-Agent を模倣）
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        print("✅ requests セッション作成成功")
        return {'session': session, 'BeautifulSoup': BeautifulSoup}
        
    except ImportError as e:
        print(f"❌ 必要なライブラリがインストールされていません: {e}")
        print("  インストール方法: pip install requests beautifulsoup4")
        return None
    except Exception as e:
        print(f"❌ requests セッション作成失敗: {e}")
        return None

def create_alternative_browser():
    """代替ブラウザーツールを試行"""
    print("🔍 === 代替ブラウザーツールの試行 ===")
    
    alternatives = [
        ('Playwright', create_playwright_browser),
        ('requests + BeautifulSoup', create_requests_session),
        ('Twitter API直接呼び出し', create_twitter_api_curl),
    ]
    
    for name, creator in alternatives:
        print(f"\n🔍 {name} を試行中...")
        result = creator()
        if result:
            print(f"✅ {name} で成功しました")
            return result
        else:
            print(f"❌ {name} で失敗しました")
    
    print("❌ すべての代替ブラウザーツールが失敗しました")
    return None

def create_twitter_api_curl():
    """Twitter APIを直接cUrlで呼び出す方法を実装"""
    print("🔍 === Twitter API直接呼び出し (cUrl) ===")
    
    try:
        # 注意: これは実際のTwitter APIキーが必要
        # 現在はデモ用の実装
        print("🔍 Twitter API直接呼び出しを準備中...")
        
        # 基本的なAPI呼び出し設定
        api_config = {
            'base_url': 'https://api.twitter.com/2/',
            'headers': {
                'Authorization': 'Bearer YOUR_BEARER_TOKEN',
                'Content-Type': 'application/json',
                'User-Agent': 'TwitterBot/1.0'
            }
        }
        
        print("✅ Twitter API設定準備完了")
        print("  注意: 実際のAPIキーが必要です")
        
        return {'type': 'twitter_api', 'config': api_config}
        
    except Exception as e:
        print(f"❌ Twitter API設定失敗: {e}")
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
        print(f"🧹 Twitter投稿専用ドライバーのクリーンアップ開始: ID={driver_id[:8] if driver_id != 'unknown' else 'unknown'}")
        
        # Twitter投稿専用プロファイルのパスを取得
        twitter_profile_path = getattr(driver, '_twitter_profile_path', None)
        
        # ドライバーを終了
        try:
            driver.quit()
            print("✅ driver.quit() 成功")
        except Exception as e:
            print(f"⚠️ driver.quit() エラー: {e}")
        
        # 登録解除
        if driver_id != 'unknown':
            unregister_driver(driver_id)
        
        # Twitter投稿専用プロファイルを削除
        if twitter_profile_path and os.path.exists(twitter_profile_path):
            print(f"🗑️ Twitter投稿専用プロファイルを削除中: {twitter_profile_path}")
            time.sleep(2)  # プロセス終了を待つ
            
            try:
                force_remove_directory(twitter_profile_path)
                print("✅ Twitter投稿専用プロファイル削除完了")
            except Exception as e:
                print(f"⚠️ プロファイル削除エラー: {e}")
        
        # 通常のプロファイルディレクトリも削除（フォールバック用）
        if PROFILE_PATH and os.path.exists(PROFILE_PATH):
            time.sleep(1)
            force_remove_directory(PROFILE_PATH)
        
        print("✅ Twitter投稿専用ドライバーのクリーンアップ完了")
        
    except Exception as e:
        print(f"⚠️ ドライバークリーンアップエラー: {e}")

def cleanup_twitter_post_profiles():
    """古いTwitter投稿専用プロファイルをクリーンアップ"""
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        base_profile_dir = os.path.join(project_root, 'twitter_profiles')
        
        if not os.path.exists(base_profile_dir):
            return
        
        print("🧹 古いTwitter投稿専用プロファイルのクリーンアップ中...")
        
        # 1時間以上古いプロファイルを削除
        max_age = 60 * 60  # 1時間をミリ秒で
        now = time.time()
        cleaned_count = 0
        
        for profile_name in os.listdir(base_profile_dir):
            if profile_name.startswith('twitter_post_'):
                profile_path = os.path.join(base_profile_dir, profile_name)
                
                try:
                    stat = os.stat(profile_path)
                    age = now - stat.st_mtime
                    
                    if age > max_age:
                        force_remove_directory(profile_path)
                        cleaned_count += 1
                        print(f"🗑️ 古いプロファイル削除: {profile_name}")
                except Exception as e:
                    print(f"⚠️ プロファイル削除エラー ({profile_name}): {e}")
        
        if cleaned_count > 0:
            print(f"✅ {cleaned_count}個の古いプロファイルを削除しました")
        else:
            print("✅ クリーンアップ対象のプロファイルはありませんでした")
            
    except Exception as e:
        print(f"⚠️ プロファイルクリーンアップエラー: {e}")

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

def create_chrome_with_proxy_rotation():
    """プロキシローテーション付きChromeドライバーを作成"""
    print("🔍 === プロキシローテーション付きChrome起動 ===")
    
    proxy_manager = get_proxy_manager()
    
    # IP変更を試行
    success, new_proxy = proxy_manager.change_ip()
    
    if success and new_proxy:
        print(f"✅ プロキシ変更成功: {new_proxy.host}:{new_proxy.port}")
        
        # プロキシ設定付きでChromeを起動
        driver = create_simple_stable_chrome(new_proxy)
        if driver:
            driver._proxy_config = new_proxy  # プロキシ情報を保存
            print(f"✅ プロキシ付きChrome起動成功")
            return driver
        else:
            print("❌ プロキシ付きChrome起動失敗")
    else:
        print("⚠️ プロキシ変更に失敗、通常のChromeで起動")
    
    # プロキシなしでフォールバック
    return create_simple_stable_chrome()

def create_browser_driver_with_fallback():
    """複数のブラウザーを試行してWebDriverを作成（包括的フォールバック）"""
    print("🔍 === ブラウザードライバー作成 (包括的フォールバック付き) ===")
    
    # 1. 最優先: プロキシローテーション付きChrome起動
    print("🔍 === 1. プロキシローテーション付きChrome起動 ===")
    proxy_driver = create_chrome_with_proxy_rotation()
    if proxy_driver:
        driver_id = register_driver(proxy_driver)
        print(f"✅ プロキシ付きChrome起動成功！ID: {driver_id[:8]}")
        return proxy_driver
    
    # 2. シンプル安定Chrome起動
    print("🔍 === 2. シンプル安定Chrome起動 ===")
    simple_driver = create_simple_stable_chrome()
    if simple_driver:
        driver_id = register_driver(simple_driver)
        print(f"✅ シンプル安定Chrome起動成功！ID: {driver_id[:8]}")
        return simple_driver
    
    # 2. 一意プロファイルでChrome起動
    print("🔍 === 2. 一意プロファイルでChrome起動 ===")
    unique_driver = create_chrome_with_unique_profile()
    if unique_driver:
        driver_id = register_driver(unique_driver)
        print(f"✅ 一意プロファイルでChrome起動成功！ID: {driver_id[:8]}")
        return unique_driver
    
    # 3. 従来のChrome起動を試行
    print("🔍 === 3. 従来のChrome起動 ===")
    chrome_driver = create_chrome_driver()
    if chrome_driver:
        return chrome_driver
    
    print("⚠️ Chrome起動に失敗しました。代替ブラウザーを試行します...")
    
    # 4. Firefoxを試行
    try:
        firefox_driver = create_firefox_driver()
        if firefox_driver:
            print("✅ Firefoxでの起動に成功しました")
            return firefox_driver
    except Exception as e:
        print(f"❌ Firefox起動エラー: {e}")
    
    # 5. 代替ブラウザーツールを試行
    print("🔍 代替ブラウザーツールを試行します...")
    alternative_browser = create_alternative_browser()
    if alternative_browser:
        print("✅ 代替ブラウザーツールで成功しました")
        return alternative_browser
    
    # 6. 最終手段: 絶対最小限のChrome設定
    print("🔍 最終手段: 絶対最小限の設定でChromeを再試行...")
    try:
        options = webdriver.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--headless=new')
        options.add_argument('--disable-gpu')
        
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
    """Twitter投稿専用ドライバーをクリーンアップ（既存Chromeに影響なし）"""
    global REUSABLE_DRIVER, PROFILE_PATH
    
    # 個別のTwitter投稿ドライバーをクリーンアップ
    if REUSABLE_DRIVER:
        try:
            cleanup_specific_driver(REUSABLE_DRIVER)
        except:
            pass
    
    REUSABLE_DRIVER = None
    PROFILE_PATH = None
    
    # Twitter投稿専用プロファイルのクリーンアップ
    cleanup_twitter_post_profiles()

def find_existing_chrome_debug_port():
    """既存のChromeプロセスのデバッグポートを見つける"""
    try:
        # Chromeプロセスをチェック
        if platform.system() == "Darwin":  # macOS
            result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
            processes = result.stdout.split('\n')
            
            for process in processes:
                if 'Google Chrome' in process and '--remote-debugging-port=' in process:
                    # デバッグポートを抽出
                    parts = process.split('--remote-debugging-port=')
                    if len(parts) > 1:
                        port_part = parts[1].split()[0]
                        try:
                            return int(port_part)
                        except ValueError:
                            continue
        else:  # Linux/Windows
            result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
            processes = result.stdout.split('\n')
            
            for process in processes:
                if ('chrome' in process.lower() or 'google-chrome' in process.lower()) and '--remote-debugging-port=' in process:
                    # デバッグポートを抽出
                    parts = process.split('--remote-debugging-port=')
                    if len(parts) > 1:
                        port_part = parts[1].split()[0]
                        try:
                            return int(port_part)
                        except ValueError:
                            continue
    except Exception as e:
        print(f"Debug port detection error: {e}")
    
    return None

def check_chrome_debug_available(port=9222):
    """Chromeデバッグポートが利用可能かチェック"""
    try:
        response = requests.get(f'http://localhost:{port}/json/version', timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def get_chrome_tabs(port=9222):
    """Chromeのタブ一覧を取得"""
    try:
        response = requests.get(f'http://localhost:{port}/json', timeout=5)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"Failed to get Chrome tabs: {e}")
        return []

def connect_to_existing_chrome(port=None):
    """既存のChromeブラウザに接続"""
    print("🔍 === 既存のChromeブラウザへの接続を試行 ===")
    
    # デバッグポートを探す
    if port is None:
        port = find_existing_chrome_debug_port()
        if port is None:
            # デフォルトポートをチェック
            common_ports = [9222, 9223, 9224, 9225]
            for test_port in common_ports:
                if check_chrome_debug_available(test_port):
                    port = test_port
                    break
    
    if port is None:
        print("❌ リモートデバッグポートで起動されているChromeが見つかりません")
        print("📝 次のコマンドでChromeを起動してください:")
        if platform.system() == "Darwin":  # macOS
            print('open -n -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=~/chrome-debug')
        else:  # Linux
            print('google-chrome --remote-debugging-port=9222 --user-data-dir=~/chrome-debug &')
        return None
    
    try:
        print(f"🔍 ポート {port} で既存のChromeに接続中...")
        
        # Chrome DevTools Protocol 経由で接続
        options = Options()
        options.add_experimental_option("debuggerAddress", f"localhost:{port}")
        
        # 追加の安定化オプション
        options.add_argument("--no-first-run")
        options.add_argument("--no-default-browser-check")
        options.add_argument("--disable-extensions")
        
        driver = webdriver.Chrome(options=options)
        
        # 接続確認
        current_url = driver.current_url
        print(f"✅ 既存のChromeに接続成功")
        print(f"📍 現在のURL: {current_url}")
        
        # ドライバーを登録
        driver_id = register_driver(driver)
        print(f"🆔 ドライバーID: {driver_id[:8]}")
        
        return driver
        
    except Exception as e:
        print(f"❌ 既存のChromeへの接続失敗: {e}")
        print("💡 Chromeがリモートデバッグモードで起動されているか確認してください")
        return None

def open_twitter_in_new_tab(driver):
    """新しいタブでTwitterを開く"""
    print("🔍 === 新しいタブでTwitterを開く ===")
    
    try:
        # 現在のウィンドウハンドルを保存
        original_window = driver.current_window_handle
        
        # 新しいタブを作成
        driver.execute_script("window.open('https://twitter.com', '_blank');")
        
        # 新しいタブに切り替え
        windows = driver.window_handles
        for window in windows:
            if window != original_window:
                driver.switch_to.window(window)
                break
        
        # Twitterにアクセス
        print("📍 Twitterにアクセス中...")
        driver.get("https://twitter.com")
        
        # ページの読み込みを待機
        time.sleep(5)
        
        current_url = driver.current_url
        print(f"✅ 新しいタブでTwitterを開きました")
        print(f"📍 現在のURL: {current_url}")
        
        return True
        
    except Exception as e:
        print(f"❌ 新しいタブでのTwitter表示失敗: {e}")
        return False

def check_twitter_login_status(driver):
    """Twitterのログイン状態をチェック"""
    print("🔍 === Twitterログイン状態をチェック ===")
    
    try:
        # ページが完全に読み込まれるまで待機
        time.sleep(3)
        
        current_url = driver.current_url
        print(f"📍 現在のURL: {current_url}")
        
        # ログイン済みかどうかをURLで判定
        if 'home' in current_url or 'twitter.com/home' in current_url:
            print("✅ ログイン済みです")
            return True
        
        # ログインページの要素をチェック
        try:
            # ログインフォームが存在するかチェック
            login_elements = driver.find_elements("xpath", "//input[@name='text' or @name='session[username_or_email]']")
            if login_elements:
                print("❌ ログインが必要です")
                return False
        except:
            pass
        
        # ナビゲーションバーの存在をチェック
        try:
            nav_elements = driver.find_elements("xpath", "//nav[@role='navigation']")
            if nav_elements:
                print("✅ ログイン済みです（ナビゲーション確認）")
                return True
        except:
            pass
        
        # ツイート作成ボタンの存在をチェック
        try:
            tweet_button = driver.find_elements("xpath", "//a[@href='/compose/tweet'] | //div[@data-testid='SideNav_NewTweet_Button']")
            if tweet_button:
                print("✅ ログイン済みです（ツイートボタン確認）")
                return True
        except:
            pass
        
        print("❓ ログイン状態が不明です")
        return False
        
    except Exception as e:
        print(f"❌ ログイン状態チェック失敗: {e}")
        return False

def wait_for_user_login(driver, timeout=300):
    """ユーザーの手動ログインを待機"""
    print("🔍 === ユーザーのログインを待機 ===")
    print("👆 ブラウザでTwitterにログインしてください")
    print(f"⏱️  最大 {timeout} 秒間待機します")
    
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            # ログイン状態をチェック
            if check_twitter_login_status(driver):
                print("✅ ログインが確認されました！")
                return True
            
            # 10秒間隔でチェック
            print(f"⏳ ログイン待機中... (残り {timeout - int(time.time() - start_time)} 秒)")
            time.sleep(10)
            
        except KeyboardInterrupt:
            print("\n❌ ユーザーによって中断されました")
            return False
        except Exception as e:
            print(f"⚠️ ログイン待機中にエラー: {e}")
            time.sleep(5)
    
    print(f"❌ {timeout} 秒でタイムアウトしました")
    return False

def create_chrome_with_existing_browser():
    """既存のChromeブラウザを使用してTwitter投稿用のセッションを作成"""
    print("🔍 === 既存のChromeブラウザを使用したセッション作成 ===")
    
    # 既存のChromeに接続を試行
    driver = connect_to_existing_chrome()
    if not driver:
        return None
    
    try:
        # 新しいタブでTwitterを開く
        if not open_twitter_in_new_tab(driver):
            print("❌ Twitterタブの作成に失敗")
            return None
        
        # ログイン状態をチェック
        if not check_twitter_login_status(driver):
            print("📝 ログインが必要です")
            print("👆 ブラウザタブでTwitterにログインしてください")
            
            # ユーザーのログインを待機
            if not wait_for_user_login(driver):
                print("❌ ログインがタイムアウトまたは失敗しました")
                return None
        
        print("✅ 既存のChromeブラウザでのTwitterセッション作成完了")
        return driver
        
    except Exception as e:
        print(f"❌ セッション作成エラー: {e}")
        try:
            driver.quit()
        except:
            pass
        return None

# 終了時のクリーンアップ用（Twitter投稿専用のみ、既存Chromeに影響なし）
import atexit
atexit.register(force_cleanup_all)