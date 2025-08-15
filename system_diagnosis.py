#!/usr/bin/env python3
"""
macOS システム全体クラッシュの診断ツール
"""

import subprocess
import sys
import os
import psutil
import time
from pathlib import Path

def get_system_limits():
    """システムリソース制限を確認"""
    print("🔍 === システムリソース制限チェック ===")
    
    try:
        # ulimit情報を取得
        limits_info = {
            'open_files': subprocess.run(['bash', '-c', 'ulimit -n'], capture_output=True, text=True),
            'max_processes': subprocess.run(['bash', '-c', 'ulimit -u'], capture_output=True, text=True),
            'virtual_memory': subprocess.run(['bash', '-c', 'ulimit -v'], capture_output=True, text=True),
            'core_file_size': subprocess.run(['bash', '-c', 'ulimit -c'], capture_output=True, text=True),
        }
        
        for limit_name, result in limits_info.items():
            if result.returncode == 0:
                value = result.stdout.strip()
                print(f"📊 {limit_name}: {value}")
            else:
                print(f"❌ {limit_name}: 取得失敗")
                
    except Exception as e:
        print(f"❌ システム制限チェックエラー: {e}")

def get_memory_info():
    """メモリ使用状況を確認"""
    print("\n🔍 === メモリ使用状況 ===")
    
    try:
        # システムメモリ情報
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        print(f"📊 物理メモリ:")
        print(f"  - 総容量: {mem.total / (1024**3):.1f} GB")
        print(f"  - 使用中: {mem.used / (1024**3):.1f} GB ({mem.percent:.1f}%)")
        print(f"  - 利用可能: {mem.available / (1024**3):.1f} GB")
        
        print(f"📊 スワップメモリ:")
        print(f"  - 総容量: {swap.total / (1024**3):.1f} GB")
        print(f"  - 使用中: {swap.used / (1024**3):.1f} GB ({swap.percent:.1f}%)")
        
        # メモリプレッシャー警告
        if mem.percent > 80:
            print("⚠️ WARNING: メモリ使用率が80%を超えています！")
        if swap.percent > 50:
            print("⚠️ WARNING: スワップ使用率が50%を超えています！")
            
    except Exception as e:
        print(f"❌ メモリ情報取得エラー: {e}")

def get_process_info():
    """プロセス情報を確認"""
    print("\n🔍 === プロセス情報 ===")
    
    try:
        # 現在のプロセス数
        process_count = len(psutil.pids())
        print(f"📊 総プロセス数: {process_count}")
        
        # Chrome関連プロセス
        chrome_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cpu_percent']):
            try:
                if 'chrome' in proc.info['name'].lower() or 'google chrome' in proc.info['name'].lower():
                    chrome_processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        print(f"📊 Chrome関連プロセス: {len(chrome_processes)}個")
        if len(chrome_processes) > 10:
            print("⚠️ WARNING: Chrome関連プロセスが多数実行中です！")
            
        # メモリ使用量上位プロセス
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'memory_info']):
            try:
                processes.append({
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'memory_mb': proc.info['memory_info'].rss / (1024 * 1024)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        processes.sort(key=lambda x: x['memory_mb'], reverse=True)
        print("\n📊 メモリ使用量TOP5:")
        for i, proc in enumerate(processes[:5]):
            print(f"  {i+1}. {proc['name']} (PID:{proc['pid']}) - {proc['memory_mb']:.1f} MB")
            
    except Exception as e:
        print(f"❌ プロセス情報取得エラー: {e}")

def check_chrome_version():
    """ChromeとChromeDriverのバージョン確認"""
    print("\n🔍 === Chrome/ChromeDriver バージョンチェック ===")
    
    try:
        # Chrome version
        chrome_result = subprocess.run([
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
            '--version'
        ], capture_output=True, text=True, timeout=10)
        
        if chrome_result.returncode == 0:
            chrome_version = chrome_result.stdout.strip()
            print(f"🌐 Chrome: {chrome_version}")
        else:
            print("❌ Chrome バージョン取得失敗")
            
    except Exception as e:
        print(f"❌ Chrome バージョンチェックエラー: {e}")
    
    try:
        # ChromeDriver version
        chromedriver_result = subprocess.run([
            'chromedriver', '--version'
        ], capture_output=True, text=True, timeout=10)
        
        if chromedriver_result.returncode == 0:
            chromedriver_version = chromedriver_result.stdout.strip()
            print(f"🚗 ChromeDriver: {chromedriver_version}")
        else:
            print("❌ ChromeDriver バージョン取得失敗")
            
    except FileNotFoundError:
        print("❌ ChromeDriver が見つかりません")
    except Exception as e:
        print(f"❌ ChromeDriver バージョンチェックエラー: {e}")

def check_gpu_info():
    """GPU/グラフィック情報を確認"""
    print("\n🔍 === GPU/グラフィック情報 ===")
    
    try:
        # システムプロファイラーでGPU情報を取得
        gpu_result = subprocess.run([
            'system_profiler', 'SPDisplaysDataType'
        ], capture_output=True, text=True, timeout=15)
        
        if gpu_result.returncode == 0:
            lines = gpu_result.stdout.split('\n')
            for line in lines:
                if 'Chipset Model' in line or 'VRAM' in line or 'Metal' in line:
                    print(f"📊 {line.strip()}")
        else:
            print("❌ GPU情報取得失敗")
            
    except Exception as e:
        print(f"❌ GPU情報チェックエラー: {e}")

def check_file_descriptors():
    """ファイルディスクリプタ使用状況を確認"""
    print("\n🔍 === ファイルディスクリプタ使用状況 ===")
    
    try:
        # 現在のプロセスのファイルディスクリプタ数
        current_process = psutil.Process()
        fd_count = current_process.num_fds()
        print(f"📊 現在のプロセスのFD数: {fd_count}")
        
        # システム全体のファイル数
        try:
            lsof_result = subprocess.run(['lsof'], capture_output=True, text=True, timeout=10)
            if lsof_result.returncode == 0:
                file_count = len(lsof_result.stdout.split('\n')) - 1
                print(f"📊 システム全体の開いているファイル数: {file_count}")
                if file_count > 50000:
                    print("⚠️ WARNING: システム全体で開いているファイル数が多すぎます！")
        except subprocess.TimeoutExpired:
            print("⚠️ lsof コマンドがタイムアウトしました（システムに負荷がかかっている可能性）")
            
    except Exception as e:
        print(f"❌ ファイルディスクリプタチェックエラー: {e}")

def check_system_logs():
    """システムログをチェック"""
    print("\n🔍 === システムログチェック（直近のクラッシュ） ===")
    
    try:
        # 最近のクラッシュレポートを確認
        crash_reports_dir = Path.home() / "Library" / "Logs" / "DiagnosticReports"
        
        if crash_reports_dir.exists():
            recent_crashes = []
            for crash_file in crash_reports_dir.glob("*.crash"):
                # 1日以内のクラッシュレポートのみチェック
                if time.time() - crash_file.stat().st_mtime < 86400:
                    recent_crashes.append(crash_file.name)
            
            if recent_crashes:
                print(f"⚠️ 直近24時間のクラッシュレポート: {len(recent_crashes)}件")
                for crash in recent_crashes[:5]:  # 最新5件のみ表示
                    print(f"  - {crash}")
            else:
                print("✅ 直近24時間のクラッシュレポートはありません")
        else:
            print("❌ クラッシュレポートディレクトリが見つかりません")
            
    except Exception as e:
        print(f"❌ システムログチェックエラー: {e}")

def main():
    print("🔍 macOS システム全体クラッシュ診断ツール")
    print("=" * 60)
    
    print("💡 この診断は、Seleniumによるアプリケーション全体クラッシュの")
    print("💡 根本原因を特定するためのものです\n")
    
    # 各種システム情報を収集
    get_memory_info()
    get_process_info()
    get_system_limits()
    check_chrome_version()
    check_gpu_info()
    check_file_descriptors()
    check_system_logs()
    
    print("\n" + "=" * 60)
    print("🎯 診断完了")
    print("\n💡 問題が特定された場合は:")
    print("  - メモリ不足 → メモリ制限の実装")
    print("  - FD枯渇 → ファイルディスクリプタ制限")
    print("  - プロセス過多 → プロセス数制限")
    print("  - バージョン不整合 → ChromeDriver再インストール")
    print("  - GPU競合 → ヘッドレスモード強制")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️ 診断が中断されました")
    except Exception as e:
        print(f"\n❌ 診断実行エラー: {e}")