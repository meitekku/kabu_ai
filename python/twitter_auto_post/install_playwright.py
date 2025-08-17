#!/usr/bin/env python3
"""
Playwrightブラウザインストールスクリプト
"""

import subprocess
import sys
import os

def install_playwright_browsers():
    """Playwrightブラウザをインストール"""
    print("🔧 Playwrightブラウザのインストールを開始します...")
    print("=" * 60)
    
    try:
        # Playwrightがインストールされているか確認
        try:
            import playwright
            print("✅ Playwrightパッケージは既にインストールされています")
        except ImportError:
            print("❌ Playwrightパッケージが見つかりません")
            print("🔧 pip install playwright を実行してください")
            return False
        
        # Chromiumブラウザのインストール
        print("\n📦 Chromiumブラウザをインストール中...")
        result = subprocess.run(
            ["playwright", "install", "chromium"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Chromiumブラウザのインストールが完了しました！")
            print("\n🎉 インストール成功！")
            print("Twitter自動投稿機能が使用可能になりました。")
            return True
        else:
            print("❌ インストール中にエラーが発生しました")
            print(f"エラー内容: {result.stderr}")
            
            # 代替コマンドの提案
            print("\n🔧 以下のコマンドを手動で実行してください:")
            print("  1. python -m playwright install chromium")
            print("  2. または: playwright install")
            return False
            
    except FileNotFoundError:
        print("❌ playwrightコマンドが見つかりません")
        print("\n🔧 以下の手順でインストールしてください:")
        print("  1. pip install playwright")
        print("  2. python -m playwright install chromium")
        return False
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
        return False

if __name__ == "__main__":
    print("Playwright自動インストールツール")
    print("このスクリプトはTwitter自動投稿に必要なブラウザをインストールします")
    print("")
    
    success = install_playwright_browsers()
    
    if success:
        print("\n✅ セットアップ完了")
        print("Twitter自動投稿機能をお使いいただけます！")
    else:
        print("\n❌ セットアップ失敗")
        print("上記の手順に従って手動でインストールしてください")
        
    print("\n" + "=" * 60)
    print("インストールコマンド一覧:")
    print("  基本: playwright install chromium")
    print("  全ブラウザ: playwright install")
    print("  依存関係含む: playwright install --with-deps chromium")
    print("=" * 60)