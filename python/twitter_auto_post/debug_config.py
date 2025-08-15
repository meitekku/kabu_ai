#!/usr/bin/env python3
"""
デバッグ出力設定とログファイル管理
"""

import logging
import os
import sys
from datetime import datetime
from pathlib import Path

class DebugConfig:
    """デバッグ出力の設定管理クラス"""
    
    def __init__(self, log_dir="logs", enable_file_logging=True, enable_console_logging=True):
        self.log_dir = Path(log_dir)
        self.enable_file_logging = enable_file_logging
        self.enable_console_logging = enable_console_logging
        self.setup_logging()
    
    def setup_logging(self):
        """ログ設定をセットアップ"""
        # ログディレクトリ作成
        if self.enable_file_logging:
            self.log_dir.mkdir(exist_ok=True)
        
        # ルートロガーを取得
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)
        
        # 既存のハンドラーをクリア
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # フォーマッター設定
        detailed_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
        )
        simple_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        
        # ファイルハンドラー設定
        if self.enable_file_logging:
            # デバッグログファイル（全レベル）
            debug_file = self.log_dir / f"debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
            file_handler = logging.FileHandler(debug_file, encoding='utf-8')
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(detailed_formatter)
            root_logger.addHandler(file_handler)
            
            # エラーログファイル（エラーのみ）
            error_file = self.log_dir / f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
            error_handler = logging.FileHandler(error_file, encoding='utf-8')
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(detailed_formatter)
            root_logger.addHandler(error_handler)
            
            print(f"📁 ログファイル:")
            print(f"  デバッグ: {debug_file.absolute()}")
            print(f"  エラー: {error_file.absolute()}")
        
        # コンソールハンドラー設定
        if self.enable_console_logging:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(simple_formatter)
            root_logger.addHandler(console_handler)
            print("📺 コンソール出力: 有効 (INFO以上)")
        
        print("✅ デバッグ設定完了")
    
    def get_logger(self, name=None):
        """ロガーを取得"""
        return logging.getLogger(name)
    
    def test_logging(self):
        """ログ出力テスト"""
        logger = self.get_logger("test")
        
        print("\n🧪 ログ出力テスト開始:")
        logger.debug("これはDEBUGレベル（ファイルのみ）")
        logger.info("これはINFOレベル（ファイル+コンソール）")
        logger.warning("これはWARNINGレベル（ファイル+コンソール）")
        logger.error("これはERRORレベル（全出力先）")
        print("🧪 ログ出力テスト完了\n")
    
    def show_debug_locations(self):
        """デバッグ出力先を表示"""
        print("\n📍 デバッグ出力先:")
        print("1. コンソール出力 (stdout): リアルタイム確認用")
        print("2. ログファイル (debug_*.log): 詳細な実行記録")
        print("3. エラーログファイル (error_*.log): エラーのみ")
        
        if self.enable_file_logging:
            print(f"\n📂 ログディレクトリ: {self.log_dir.absolute()}")
            
            # 既存のログファイルを表示
            log_files = list(self.log_dir.glob("*.log"))
            if log_files:
                print("📋 既存のログファイル:")
                for log_file in sorted(log_files, key=lambda x: x.stat().st_mtime, reverse=True):
                    size = log_file.stat().st_size
                    mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                    print(f"  {log_file.name} ({size} bytes, {mtime.strftime('%Y-%m-%d %H:%M:%S')})")
        
        print("\n💡 リアルタイムでログを監視したい場合:")
        if self.enable_file_logging:
            latest_debug_log = self.log_dir / "debug_*.log"
            print(f"  tail -f {self.log_dir}/debug_*.log")
        print("  または単純にコンソール出力を確認してください")

def setup_debug_environment():
    """デバッグ環境をセットアップ"""
    # 現在のディレクトリにlogsディレクトリを作成
    current_dir = Path.cwd()
    log_dir = current_dir / "logs"
    
    debug_config = DebugConfig(log_dir=log_dir)
    debug_config.show_debug_locations()
    debug_config.test_logging()
    
    return debug_config

if __name__ == "__main__":
    print("🔍 デバッグ設定ツール")
    print("=" * 50)
    
    debug_config = setup_debug_environment()
    
    print("\n🚀 使用方法:")
    print("from debug_config import DebugConfig")
    print("debug = DebugConfig()")
    print("logger = debug.get_logger('my_module')")
    print("logger.info('デバッグメッセージ')")