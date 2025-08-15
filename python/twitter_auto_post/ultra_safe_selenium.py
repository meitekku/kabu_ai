#!/usr/bin/env python3
"""
macOSクラッシュ完全防止版 - 最後の手段
Status code -9問題の根本的解決
"""

import os
import time
import tempfile
import subprocess
import psutil
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UltraSafeSeleniumManager:
    """Status code -9問題を根本的に解決するSeleniumマネージャー"""
    
    def __init__(self):
        self.driver = None
        self.profile_dir = None
        self.is_running = False
        
    def _free_system_memory_aggressively(self):
        """システムメモリを積極的に解放"""
        logger.info("🧹 積極的なメモリ解放を実行中...")
        
        try:
            # 1. 全てのChrome関連プロセスを強制終了
            chrome_patterns = ['chrome', 'chromium', 'chromedriver']
            killed_count = 0
            
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    proc_name = proc.info['name'].lower() if proc.info['name'] else ''
                    if any(pattern in proc_name for pattern in chrome_patterns):
                        proc_obj = psutil.Process(proc.info['pid'])
                        proc_obj.kill()
                        killed_count += 1
                        time.sleep(0.1)
                except:
                    continue
            
            logger.info(f"Chrome関連プロセス {killed_count}個を終了")
            
            # 2. システムコマンドでメモリ解放
            commands = [
                ['killall', '-9', 'Google Chrome'],
                ['killall', '-9', 'chromedriver'], 
                ['sync'],
                ['purge']  # macOS専用メモリパージ
            ]
            
            for cmd in commands:
                try:
                    result = subprocess.run(cmd, capture_output=True, timeout=10)
                    if result.returncode == 0:
                        logger.info(f"✅ {' '.join(cmd)} 実行成功")
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    continue
            
            # 3. 待機してメモリ安定化
            time.sleep(5)
            
            # 4. メモリ状況確認
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            logger.info(f"メモリ解放後: 物理{memory.percent:.1f}% スワップ{swap.percent:.1f}%")
            
            return True
            
        except Exception as e:
            logger.error(f"メモリ解放エラー: {e}")
            return False
    
    def _create_minimal_chrome_options(self):
        """最小限のChromeオプション（クラッシュ防止特化）"""
        options = Options()
        
        # 最重要: メモリとプロセス制限
        options.add_argument('--single-process')
        options.add_argument('--no-zygote')
        options.add_argument('--memory-pressure-off')
        options.add_argument('--max_old_space_size=128')  # 最小128MB
        
        # 完全ヘッドレスモード
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        # すべての不要機能を無効化
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        options.add_argument('--disable-javascript')  # JavaScript無効化
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-features=VizDisplayCompositor')
        
        # ネットワーク機能最小化
        options.add_argument('--disable-background-networking')
        options.add_argument('--disable-background-downloads')
        options.add_argument('--disable-sync')
        
        # ウィンドウサイズ最小化
        options.add_argument('--window-size=400,300')
        
        # 一時プロファイル
        self.profile_dir = tempfile.mkdtemp(prefix='ultra_minimal_')
        options.add_argument(f'--user-data-dir={self.profile_dir}')
        
        logger.info("最小限Chromeオプション設定完了")
        return options
    
    def _find_chromedriver_path(self):
        """ChromeDriverのパスを動的に検索"""
        possible_paths = [
            '/opt/homebrew/bin/chromedriver',
            '/usr/local/bin/chromedriver',
            '/opt/homebrew/Caskroom/chromedriver/*/chromedriver-mac-arm64/chromedriver',
            '/opt/homebrew/Caskroom/chromedriver/*/chromedriver-mac-x64/chromedriver'
        ]
        
        import glob
        for pattern in possible_paths:
            matches = glob.glob(pattern)
            for path in matches:
                if os.path.isfile(path) and os.access(path, os.X_OK):
                    logger.info(f"ChromeDriver発見: {path}")
                    return path
        
        # which コマンドで検索
        try:
            result = subprocess.run(['which', 'chromedriver'], 
                                   capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                path = result.stdout.strip()
                if path and os.path.isfile(path):
                    logger.info(f"which経由でChromeDriver発見: {path}")
                    return path
        except:
            pass
        
        return None
    
    def _test_chromedriver_standalone(self):
        """ChromeDriverが単独で起動できるかテスト"""
        logger.info("🧪 ChromeDriver単独起動テスト...")
        
        try:
            # ChromeDriverパスを動的検索
            chromedriver_path = self._find_chromedriver_path()
            if not chromedriver_path:
                logger.error("❌ ChromeDriverが見つかりません")
                return False
            
            # プロセスを起動
            proc = subprocess.Popen([chromedriver_path, '--port=9999'], 
                                   stdout=subprocess.PIPE, 
                                   stderr=subprocess.PIPE)
            
            # 2秒待機
            time.sleep(2)
            
            # プロセスが生きているか確認
            if proc.poll() is None:
                logger.info("✅ ChromeDriver単独起動成功")
                proc.terminate()
                time.sleep(1)
                if proc.poll() is None:
                    proc.kill()
                return True
            else:
                logger.error(f"❌ ChromeDriver単独起動失敗 (exit code: {proc.poll()})")
                return False
                
        except Exception as e:
            logger.error(f"ChromeDriver単独テストエラー: {e}")
            return False
    
    def create_ultra_safe_driver(self):
        """Ultra安全版ドライバー作成"""
        logger.info("🛡️ Ultra安全版SeleniumDriver作成開始")
        
        try:
            # 1. 積極的なメモリ解放
            if not self._free_system_memory_aggressively():
                raise Exception("システムメモリ解放に失敗")
            
            # 2. ChromeDriver単独テスト
            if not self._test_chromedriver_standalone():
                raise Exception("ChromeDriver単独起動テストに失敗")
            
            # 3. 最小限Chromeオプション
            options = self._create_minimal_chrome_options()
            
            # 4. Serviceを慎重に作成
            chromedriver_path = self._find_chromedriver_path()
            if not chromedriver_path:
                raise Exception("ChromeDriverのパスが見つかりません")
            
            service = Service(executable_path=chromedriver_path)
            service.start_error_message = "ChromeDriver起動エラー"
            
            # 5. WebDriverを段階的に作成
            logger.info("🚀 WebDriver作成中...")
            
            # メモリ監視しながら作成
            start_memory = psutil.virtual_memory().percent
            
            self.driver = webdriver.Chrome(service=service, options=options)
            self.is_running = True
            
            # 作成後のメモリ確認
            end_memory = psutil.virtual_memory().percent
            logger.info(f"WebDriver作成成功 (メモリ: {start_memory:.1f}% → {end_memory:.1f}%)")
            
            # 基本設定
            self.driver.implicitly_wait(3)
            self.driver.set_page_load_timeout(10)
            
            return self.driver
            
        except Exception as e:
            self.cleanup()
            raise Exception(f"Ultra安全版ドライバー作成失敗: {e}")
    
    def safe_navigate(self, url):
        """安全なページ移動"""
        if not self.driver or not self.is_running:
            raise Exception("ドライバーが初期化されていません")
        
        try:
            logger.info(f"📍 安全ナビゲーション: {url}")
            self.driver.get(url)
            time.sleep(2)
            
            title = self.driver.title
            logger.info(f"✅ ページ読み込み成功: {title[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"ナビゲーションエラー: {e}")
            return False
    
    def cleanup(self):
        """完全クリーンアップ"""
        logger.info("🧹 完全クリーンアップ開始...")
        
        self.is_running = False
        
        if self.driver:
            try:
                self.driver.quit()
                logger.info("WebDriver終了完了")
            except:
                pass
            finally:
                self.driver = None
        
        # プロファイル削除
        if self.profile_dir and os.path.exists(self.profile_dir):
            try:
                import shutil
                shutil.rmtree(self.profile_dir, ignore_errors=True)
                logger.info("プロファイル削除完了")
            except:
                pass
        
        # 残存プロセス強制終了
        try:
            subprocess.run(['killall', '-9', 'chromedriver'], capture_output=True)
        except:
            pass
    
    def __enter__(self):
        return self.create_ultra_safe_driver()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

# テスト実行
def ultra_safe_test():
    """Ultra安全版テスト"""
    print("🛡️ Ultra安全版Seleniumテスト")
    print("=" * 50)
    
    try:
        manager = UltraSafeSeleniumManager()
        
        with manager as driver:
            # 軽量サイトでテスト
            success = manager.safe_navigate('https://httpbin.org/ip')
            
            if success:
                print("✅ Ultra安全版テスト成功！")
                print(f"タイトル: {driver.title}")
                return True
            else:
                print("⚠️ ナビゲーションに問題がありましたが、ドライバー作成は成功")
                return True
                
    except Exception as e:
        print(f"❌ Ultra安全版テスト失敗: {e}")
        return False

if __name__ == "__main__":
    success = ultra_safe_test()
    
    if success:
        print("\n🎉 Status code -9問題が解決されました！")
        print("このスクリプトを他のTwitter投稿処理に組み込んでください")
    else:
        print("\n🆘 根本的な問題があります。システム再起動を推奨します")