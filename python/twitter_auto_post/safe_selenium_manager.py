#!/usr/bin/env python3
"""
macOSシステムクラッシュを防ぐセキュアなSelenium管理システム
"""

import os
import psutil
import subprocess
import time
import tempfile
import signal
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SafeSeleniumManager:
    """システムリソースを監視し、安全にSeleniumを実行するマネージャー"""
    
    def __init__(self, emergency_mode=False):
        # 緊急モードでは制限を緩和
        if emergency_mode:
            self.max_memory_usage = 0.80  # 緊急時は80%まで許可
            self.max_swap_usage = 0.60    # 緊急時は60%まで許可
            self.max_chrome_processes = 8  # 緊急時は8個まで許可
            logger.warning("緊急モードが有効 - リソース制限が緩和されています")
        else:
            self.max_memory_usage = 0.72  # 72%まで許可（現実的なレベル）
            self.max_swap_usage = 0.40    # 40%まで許可
            self.max_chrome_processes = 5  # 5個まで許可
            
        self.emergency_mode = emergency_mode
        self.driver = None
        self.profile_dir = None
        self.retry_count = 0
        self.max_retries = 2
        
    def _get_system_resources(self):
        """現在のシステムリソース使用状況を取得"""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Chrome関連プロセス数をカウント
            chrome_processes = 0
            for proc in psutil.process_iter(['name']):
                try:
                    if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                        chrome_processes += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
            return {
                'memory_percent': memory.percent / 100,
                'swap_percent': swap.percent / 100,
                'chrome_processes': chrome_processes,
                'available_memory_gb': memory.available / (1024**3)
            }
        except Exception as e:
            logger.error(f"システムリソース取得エラー: {e}")
            return None

    def _check_safety_conditions(self):
        """システムが安全に実行できる状態かチェック"""
        resources = self._get_system_resources()
        if not resources:
            return False, "リソース情報を取得できませんでした"

        warnings = []
        
        # メモリ使用量チェック
        if resources['memory_percent'] > self.max_memory_usage:
            return False, f"メモリ使用率が危険レベル: {resources['memory_percent']:.1%}"
            
        # スワップ使用量チェック
        if resources['swap_percent'] > self.max_swap_usage:
            warnings.append(f"スワップ使用率が高い: {resources['swap_percent']:.1%}")
            
        # Chrome プロセス数チェック
        if resources['chrome_processes'] > self.max_chrome_processes:
            warnings.append(f"Chrome関連プロセスが多すぎます: {resources['chrome_processes']}個")
            
        # 利用可能メモリチェック
        if resources['available_memory_gb'] < 1.0:
            return False, f"利用可能メモリが不足: {resources['available_memory_gb']:.1f}GB"
        
        if warnings:
            logger.warning("警告: " + ", ".join(warnings))
            
        return True, "安全条件をクリア"

    def _find_chromedriver_path(self):
        """ChromeDriverの場所を特定"""
        possible_paths = [
            '/opt/homebrew/bin/chromedriver',
            '/usr/local/bin/chromedriver',
            '/opt/homebrew/Caskroom/chromedriver/*/chromedriver-mac-arm64/chromedriver',
            '/opt/homebrew/Caskroom/chromedriver/*/chromedriver-mac-x64/chromedriver'
        ]
        
        # パターンマッチング付き検索
        import glob
        for pattern in possible_paths:
            matches = glob.glob(pattern)
            for path in matches:
                if os.path.isfile(path) and os.access(path, os.X_OK):
                    logger.info(f"ChromeDriver発見: {path}")
                    return path
                    
        # Homebrewで再インストールを試行
        logger.warning("ChromeDriverが見つからないため、再インストールを試行...")
        try:
            subprocess.run(['brew', 'reinstall', '--cask', 'chromedriver'], 
                         capture_output=True, timeout=60)
            time.sleep(2)
            # 再検索
            for pattern in possible_paths:
                matches = glob.glob(pattern)
                for path in matches:
                    if os.path.isfile(path) and os.access(path, os.X_OK):
                        logger.info(f"再インストール後にChromeDriver発見: {path}")
                        return path
        except Exception as e:
            logger.error(f"ChromeDriver再インストールエラー: {e}")
            
        return None

    def _cleanup_existing_chrome_safely(self):
        """既存のChrome関連プロセスを安全にクリーンアップ（強化版）"""
        logger.info("既存のChrome関連プロセスを強力にクリーンアップ中...")
        
        try:
            # 現在のPythonプロセス以外のChrome関連プロセスを特定
            current_pid = os.getpid()
            chrome_pids = []
            
            # より包括的なプロセス名検索
            chrome_patterns = ['chrome', 'chromium', 'chromedriver']
            
            for proc in psutil.process_iter(['pid', 'name', 'ppid', 'cmdline']):
                try:
                    if proc.info['pid'] == current_pid:
                        continue
                        
                    # プロセス名での検索
                    proc_name = proc.info['name'].lower() if proc.info['name'] else ''
                    
                    # コマンドラインでの検索
                    cmdline = ' '.join(proc.info['cmdline']).lower() if proc.info['cmdline'] else ''
                    
                    # Chrome関連プロセスを特定
                    is_chrome = any(pattern in proc_name or pattern in cmdline for pattern in chrome_patterns)
                    
                    if is_chrome and proc.info['ppid'] != current_pid:
                        chrome_pids.append(proc.info['pid'])
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied, TypeError):
                    continue
            
            logger.info(f"クリーンアップ対象: {len(chrome_pids)}個のプロセス")
            
            # 段階的プロセス終了（より確実）
            for pid in chrome_pids:
                try:
                    proc = psutil.Process(pid)
                    proc_name = proc.name()
                    
                    # 1段階目: SIGTERM（優雅な終了）
                    logger.info(f"プロセス終了開始: PID {pid} ({proc_name})")
                    proc.terminate()
                    
                    try:
                        proc.wait(timeout=2)
                        logger.info(f"優雅な終了成功: PID {pid}")
                        continue
                    except psutil.TimeoutExpired:
                        pass
                    
                    # 2段階目: SIGKILL（強制終了）
                    if proc.is_running():
                        proc.kill()
                        try:
                            proc.wait(timeout=2)
                            logger.info(f"強制終了成功: PID {pid}")
                        except psutil.TimeoutExpired:
                            logger.warning(f"強制終了失敗: PID {pid}")
                            
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception as e:
                    logger.warning(f"プロセス終了エラー PID {pid}: {e}")
            
            # クリーンアップ後の確認
            time.sleep(2)
            remaining = self._count_chrome_processes()
            logger.info(f"クリーンアップ後のChrome関連プロセス数: {remaining}")
                    
        except Exception as e:
            logger.error(f"Chromeプロセスクリーンアップエラー: {e}")
            
    def _count_chrome_processes(self):
        """Chrome関連プロセス数をカウント"""
        count = 0
        chrome_patterns = ['chrome', 'chromium', 'chromedriver']
        
        for proc in psutil.process_iter(['name', 'cmdline']):
            try:
                proc_name = proc.info['name'].lower() if proc.info['name'] else ''
                cmdline = ' '.join(proc.info['cmdline']).lower() if proc.info['cmdline'] else ''
                
                if any(pattern in proc_name or pattern in cmdline for pattern in chrome_patterns):
                    count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied, TypeError):
                continue
                
        return count
            
    def _force_memory_cleanup(self):
        """メモリクリーンアップを強制実行（強化版）"""
        logger.info("強力なメモリクリーンアップを実行中...")
        try:
            import gc
            
            # 1. Pythonのガベージコレクションを複数回実行
            for i in range(3):
                collected = gc.collect()
                logger.info(f"ガベージコレクション{i+1}: {collected}個のオブジェクトを解放")
                time.sleep(0.5)
            
            # 2. macOS特有のメモリプレッシャー軽減
            try:
                # ファイルシステムキャッシュをフラッシュ
                subprocess.run(['sync'], timeout=10, capture_output=True)
                logger.info("ファイルシステムキャッシュフラッシュ完了")
                
                # メモリプレッシャーを軽減（macOS専用）
                subprocess.run(['purge'], timeout=30, capture_output=True)
                logger.info("システムメモリパージ完了")
                
            except FileNotFoundError:
                logger.info("purgeコマンドが見つかりません（通常の動作）")
            except subprocess.TimeoutExpired:
                logger.warning("メモリパージがタイムアウトしました")
            except Exception as e:
                logger.warning(f"システムレベルクリーンアップエラー: {e}")
            
            # 3. アプリケーション特有のメモリ解放
            try:
                # 環境変数でメモリプレッシャーを設定
                os.environ['MALLOC_TRIM_THRESHOLD'] = '32768'  # より積極的な解放
                
                # 一時的にメモリを大量確保して解放（メモリの断片化解消）
                dummy_data = []
                for i in range(10):
                    dummy_data.append(b' ' * (1024 * 1024))  # 1MBずつ確保
                dummy_data.clear()
                del dummy_data
                
                logger.info("アプリケーションメモリ最適化完了")
                
            except Exception as e:
                logger.warning(f"アプリケーションメモリ最適化エラー: {e}")
                
            # 4. クリーンアップ後の確認
            time.sleep(2)
            resources = self._get_system_resources()
            if resources:
                logger.info(f"クリーンアップ後: メモリ{resources['memory_percent']:.1%}, スワップ{resources['swap_percent']:.1%}")
                
        except Exception as e:
            logger.warning(f"メモリクリーンアップエラー: {e}")
            
    def _emergency_system_cleanup(self):
        """緊急時のシステムクリーンアップ"""
        logger.warning("緊急システムクリーンアップを実行中...")
        
        try:
            # 1. 全てのChrome関連プロセス強制終了
            self._cleanup_existing_chrome_safely()
            
            # 2. 強力なメモリクリーンアップ
            self._force_memory_cleanup()
            
            # 3. 不要なバックグラウンドプロセスの確認
            high_memory_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'memory_percent']):
                try:
                    if proc.info['memory_percent'] > 10.0:  # 10%以上使用
                        high_memory_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'memory': proc.info['memory_percent']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            if high_memory_processes:
                logger.warning(f"高メモリ使用プロセス {len(high_memory_processes)}個を検出")
                for proc in high_memory_processes[:3]:  # 上位3個のみログ出力
                    logger.warning(f"  - {proc['name']} (PID:{proc['pid']}) {proc['memory']:.1f}%")
            
            # 4. システム状態の再確認
            time.sleep(3)
            resources = self._get_system_resources()
            if resources:
                logger.info(f"緊急クリーンアップ後: メモリ{resources['memory_percent']:.1%}, Chrome数{resources['chrome_processes']}")
                return resources['memory_percent'] < self.max_memory_usage
            
        except Exception as e:
            logger.error(f"緊急クリーンアップエラー: {e}")
            
        return False

    def _create_safe_chrome_options(self):
        """システムに負荷をかけない安全なChromeオプションを作成（強化版）"""
        options = Options()
        
        # メモリ制限オプション（より厳格）
        options.add_argument('--memory-pressure-off')
        options.add_argument('--max_old_space_size=256')  # 256MBに削減
        options.add_argument('--aggressive')
        options.add_argument('--memory-pressure-threshold=2')  # より敏感に
        options.add_argument('--max-heap-size=128')  # ヒープサイズ制限
        
        # プロセス制限オプション（強化）
        options.add_argument('--single-process')  # シングルプロセスモード
        options.add_argument('--no-zygote')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-features=TranslateUI')
        options.add_argument('--disable-ipc-flooding-protection')
        
        # GPU無効化（安定性向上）
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-software-rasterizer')
        options.add_argument('--disable-background-timer-throttling')
        options.add_argument('--disable-backgrounding-occluded-windows')
        options.add_argument('--disable-renderer-backgrounding')
        
        # ネットワーク制限（強化）
        options.add_argument('--disable-background-networking')
        options.add_argument('--disable-default-apps')
        options.add_argument('--disable-translate')
        options.add_argument('--disable-sync')
        options.add_argument('--disable-background-downloads')
        
        # パフォーマンス最適化
        options.add_argument('--disable-logging')
        options.add_argument('--disable-crash-reporter')
        options.add_argument('--disable-dev-tools')
        options.add_argument('--no-first-run')
        options.add_argument('--no-default-browser-check')
        options.add_argument('--disable-popup-blocking')
        options.add_argument('--disable-prompt-on-repost')
        options.add_argument('--disable-hang-monitor')
        
        # ヘッドレスモード
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        
        # ウィンドウサイズ制限
        options.add_argument('--window-size=800,600')  # 小さなウィンドウサイズ
        
        # 一時プロファイル作成
        self.profile_dir = tempfile.mkdtemp(prefix='ultra_safe_chrome_')
        options.add_argument(f'--user-data-dir={self.profile_dir}')
        
        # macOS M1対応（強化）
        if 'arm64' in os.uname().machine.lower():
            options.add_argument('--disable-features=VizDisplayCompositor,VizServiceDisplay')
            options.add_argument('--use-gl=disabled')
            options.add_argument('--disable-accelerated-2d-canvas')
            options.add_argument('--disable-accelerated-jpeg-decoding')
            options.add_argument('--disable-accelerated-mjpeg-decode')
            options.add_argument('--disable-accelerated-video-decode')
            
        # システム負荷軽減
        options.add_argument('--disable-domain-reliability')
        options.add_argument('--disable-component-extensions-with-background-pages')
        options.add_argument('--disable-background-downloads')
        options.add_argument('--disable-add-to-shelf')
        options.add_argument('--disable-print-preview')
        
        logger.info("強化版安全Chromeオプションを設定しました")
        return options

    def create_safe_driver(self):
        """安全性チェック後にSeleniumドライバーを作成（リトライ機能付き）"""
        while self.retry_count <= self.max_retries:
            try:
                # 1. 安全性チェック
                is_safe, message = self._check_safety_conditions()
                if not is_safe:
                    if self.retry_count < self.max_retries:
                        logger.warning(f"安全性チェック失敗 (試行{self.retry_count + 1}): {message}")
                        logger.info("メモリクリーンアップ後にリトライします...")
                        self._force_memory_cleanup()
                        self._cleanup_existing_chrome_safely()
                        time.sleep(3)
                        self.retry_count += 1
                        continue
                    else:
                        raise Exception(f"システム安全性チェック失敗: {message}")
                
                logger.info(f"安全性チェック通過: {message}")
                
                # 2. 既存プロセスクリーンアップ
                self._cleanup_existing_chrome_safely()
                
                # 3. メモリクリーンアップ
                self._force_memory_cleanup()
                time.sleep(2)
                
                # 4. ChromeDriverパス確認
                chromedriver_path = self._find_chromedriver_path()
                if not chromedriver_path:
                    raise Exception("ChromeDriverが見つかりません")
                
                # 5. 安全なドライバー作成（段階的）
                logger.info("安全なSeleniumドライバーを段階的に起動中...")
                
                # まずサービスを慎重に作成
                service = Service(executable_path=chromedriver_path)
                options = self._create_safe_chrome_options()
                
                # ChromeDriverプロセスを監視しながら起動
                logger.info("ChromeDriverサービスを起動...")
                
                # WebDriverを慎重に作成
                self.driver = webdriver.Chrome(service=service, options=options)
                
                # 起動直後の状態確認
                time.sleep(1)
                if not self._verify_driver_health():
                    raise Exception("ドライバーのヘルスチェックに失敗")
                
                # タイムアウト設定
                self.driver.implicitly_wait(5)  # より短いタイムアウト
                self.driver.set_page_load_timeout(15)  # より短いタイムアウト
                
                logger.info("SeleniumドライバーがAPIを正常に起動しました")
                return self.driver
                
            except Exception as e:
                logger.error(f"試行{self.retry_count + 1}失敗: {e}")
                self.cleanup()
                
                if self.retry_count < self.max_retries:
                    logger.info(f"リトライします... ({self.retry_count + 1}/{self.max_retries})")
                    self._force_memory_cleanup()
                    time.sleep(5)  # より長い待機
                    self.retry_count += 1
                    continue
                else:
                    raise Exception(f"最大リトライ回数到達。最後のエラー: {e}")
    
    def _verify_driver_health(self):
        """ドライバーのヘルス状態を確認"""
        try:
            if not self.driver:
                return False
                
            # 簡単な動作確認
            current_url = self.driver.current_url
            logger.info(f"ドライバーヘルスチェック成功: {current_url}")
            return True
            
        except Exception as e:
            logger.error(f"ドライバーヘルスチェック失敗: {e}")
            return False

    def cleanup(self):
        """リソースを安全にクリーンアップ"""
        if self.driver:
            try:
                self.driver.quit()
                logger.info("Seleniumドライバーを終了しました")
            except Exception as e:
                logger.error(f"ドライバー終了エラー: {e}")
            finally:
                self.driver = None
                
        # 一時プロファイル削除
        if self.profile_dir and os.path.exists(self.profile_dir):
            try:
                import shutil
                shutil.rmtree(self.profile_dir, ignore_errors=True)
                logger.info("一時プロファイルを削除しました")
            except Exception as e:
                logger.error(f"プロファイル削除エラー: {e}")

    def __enter__(self):
        return self.create_safe_driver()
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

# 使用例とユーティリティ関数
def safe_selenium_test(emergency_mode=False):
    """安全なSeleniumテストを実行"""
    try:
        manager = SafeSeleniumManager(emergency_mode=emergency_mode)
        
        # 緊急モードの場合は強力なクリーンアップを事前実行
        if emergency_mode:
            logger.warning("緊急モードでテスト実行")
            manager._emergency_system_cleanup()
        
        with manager as driver:
            driver.get('https://httpbin.org/ip')
            print("✅ 安全なSelenium実行テスト成功")
            print(f"ページタイトル: {driver.title}")
            return True
    except Exception as e:
        print(f"❌ 安全なSelenium実行テスト失敗: {e}")
        
        # 通常モードで失敗した場合は緊急モードを提案
        if not emergency_mode:
            print("\n💡 緊急モードでの再試行を推奨:")
            print("python3 safe_selenium_manager.py --emergency")
            
        return False

if __name__ == "__main__":
    import sys
    
    print("🔒 安全なSelenium管理システム")
    print("=" * 50)
    
    # コマンドライン引数チェック
    emergency_mode = '--emergency' in sys.argv or '-e' in sys.argv
    
    if emergency_mode:
        print("⚠️ 緊急モードで実行します")
        print("注意: リソース制限が緩和されます")
    
    success = safe_selenium_test(emergency_mode=emergency_mode)
    
    if not success and not emergency_mode:
        print("\n🆘 通常モードで失敗した場合の対処法:")
        print("1. メモリを解放してから再実行")
        print("2. 緊急モードで実行: python3 safe_selenium_manager.py --emergency")
        print("3. システムを再起動")