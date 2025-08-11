#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ローカルSelenium機能のテストスクリプト

使用方法:
python test-local-selenium.py
"""

import sys
import os
import time

# プロジェクトのpythonディレクトリをパスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

try:
    from twitter_auto_post.browser_manager import create_chrome_driver
    from twitter_auto_post.config import validate_credentials
    print("✅ モジュールのインポート成功")
except ImportError as e:
    print(f"❌ モジュールのインポートに失敗: {e}")
    print("python/requirements.txtの依存関係がインストールされているか確認してください")
    sys.exit(1)

def test_environment_variables():
    """環境変数のテスト"""
    print("\n🔍 === 環境変数テスト ===")
    
    # 認証情報の確認
    if validate_credentials():
        print("✅ Twitter認証情報が設定されています")
    else:
        print("❌ Twitter認証情報が設定されていません")
        print("📝 .env.localファイルでTWITTER_USERNAMEとTWITTER_PASSWORDを設定してください")
        return False
    
    # ヘッドレスモード確認
    headless = os.environ.get('HEADLESS', '').lower() == 'true'
    print(f"🔍 ヘッドレスモード: {'有効' if headless else '無効（手動ログイン可能）'}")
    
    return True

def test_chrome_driver_creation():
    """Chrome WebDriver作成のテスト"""
    print("\n🔍 === Chrome WebDriver作成テスト ===")
    
    try:
        print("🔄 Chrome WebDriverを作成中...")
        driver = create_chrome_driver()
        
        if driver:
            print("✅ Chrome WebDriver作成成功")
            
            try:
                # 基本情報を取得
                current_url = driver.current_url
                title = driver.title
                print(f"📍 現在のURL: {current_url}")
                print(f"📄 ページタイトル: {title}")
                
                # Twitterにアクセステスト
                print("🔍 Twitterページへアクセス中...")
                driver.get("https://twitter.com")
                time.sleep(5)
                
                new_url = driver.current_url
                new_title = driver.title
                print(f"📍 Twitter URL: {new_url}")
                print(f"📄 Twitterタイトル: {new_title}")
                
                # ログイン状態の簡易チェック
                if 'home' in new_url.lower() or 'login' not in new_url.lower():
                    print("✅ Twitterページアクセス成功（ログイン状態の可能性）")
                else:
                    print("🔍 Twitterログインが必要な可能性があります")
                
                print("💡 手動でTwitterにログインしてテストを続行できます")
                print("💡 Ctrl+C で終了するか、しばらく待機して自動終了します")
                
                # 30秒間の待機（手動ログイン用）
                for i in range(30, 0, -1):
                    print(f"⏳ 待機中... {i}秒", end='\r')
                    time.sleep(1)
                
                print("\n🔍 最終状態確認中...")
                final_url = driver.current_url
                final_title = driver.title
                print(f"📍 最終URL: {final_url}")
                print(f"📄 最終タイトル: {final_title}")
                
                return driver
                
            except Exception as e:
                print(f"❌ Chrome操作テストエラー: {e}")
                try:
                    driver.quit()
                except:
                    pass
                return None
        else:
            print("❌ Chrome WebDriver作成失敗")
            return None
            
    except Exception as e:
        print(f"❌ Chrome WebDriverテストエラー: {e}")
        return None

def test_profile_persistence():
    """永続プロファイルのテスト"""
    print("\n🔍 === 永続プロファイルテスト ===")
    
    try:
        from twitter_auto_post.browser_manager import get_persistent_profile_path
        
        profile_path = get_persistent_profile_path()
        print(f"🔍 永続プロファイルパス: {profile_path}")
        
        if os.path.exists(profile_path):
            print("✅ 永続プロファイルディレクトリが存在します")
            
            # プロファイル内のファイルを確認
            files = os.listdir(profile_path)
            print(f"🔍 プロファイル内のファイル数: {len(files)}")
            
            if len(files) > 0:
                print("✅ プロファイルデータが保存されています（ログイン状態保持の可能性）")
            else:
                print("🔍 プロファイルは空です（初回実行）")
        else:
            print("🔍 永続プロファイルディレクトリは未作成（初回実行）")
            
        return True
        
    except Exception as e:
        print(f"❌ 永続プロファイルテストエラー: {e}")
        return False

def main():
    """メイン処理"""
    print("🔍 === ローカルSelenium機能テスト開始 ===")
    
    # 1. 環境変数テスト
    if not test_environment_variables():
        print("\n❌ テスト失敗: 環境変数が正しく設定されていません")
        return False
    
    # 2. 永続プロファイルテスト
    if not test_profile_persistence():
        print("\n❌ テスト失敗: 永続プロファイル機能でエラーが発生しました")
        return False
    
    # 3. Chrome WebDriver作成テスト
    driver = test_chrome_driver_creation()
    if not driver:
        print("\n❌ テスト失敗: Chrome WebDriverが作成できませんでした")
        return False
    
    # クリーンアップ
    print("\n🔧 クリーンアップ中...")
    try:
        driver.quit()
        print("✅ Chrome WebDriverを終了しました")
    except Exception as e:
        print(f"⚠️ クリーンアップエラー: {e}")
    
    print("\n✅ === すべてのテスト成功 ===")
    print("🎉 ローカルSelenium機能は正常に動作しています")
    print("💡 これでTwitter自動投稿の準備が完了しました")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n✅ テスト完了: 成功")
            sys.exit(0)
        else:
            print("\n❌ テスト完了: 失敗")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n❌ ユーザーによって中断されました")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 予期しないエラー: {e}")
        sys.exit(1)