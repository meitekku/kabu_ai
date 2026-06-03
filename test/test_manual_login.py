#!/usr/bin/env python3
# 手動ログインテスト用スクリプト

import sys
import os
sys.path.append('python')

from twitter_auto_post.browser_manager import create_chrome_with_persistent_profile
from twitter_auto_post.twitter_actions import check_login_status, post_tweet
from twitter_auto_post.config import DEFAULT_MESSAGE
import time

def manual_login_test():
    """手動ログインでセッション永続化をテスト"""
    print("=== 手動ログインテスト開始 ===")
    
    # ヘッドレスモード無効でChrome起動
    print("🔍 ヘッドレスモード無効でChrome起動...")
    driver = create_chrome_with_persistent_profile(headless=False)
    
    if not driver:
        print("❌ Chrome起動失敗")
        return False
    
    try:
        # Twitterにアクセス
        print("🔍 Twitterにアクセス...")
        driver.get("https://twitter.com/home")
        time.sleep(3)
        
        # ログイン状態確認
        is_logged_in = check_login_status(driver)
        print(f"🔍 初期ログイン状態: {is_logged_in}")
        
        if not is_logged_in:
            print("📝 手動でログインしてください...")
            print("   1. ブラウザでTwitterにログイン")
            print("   2. ログイン完了後、Enterキーを押してください")
            input("   Enterキーを押して続行...")
            
            # ログイン後の状態確認
            is_logged_in = check_login_status(driver)
            print(f"🔍 ログイン後の状態: {is_logged_in}")
        
        if is_logged_in:
            print("✅ ログイン成功！初回投稿テスト...")
            success = post_tweet(driver, "永続プロファイルテスト1回目", None)
            print(f"🔍 初回投稿結果: {success}")
            
            if success:
                print("✅ 初回投稿成功！")
                
                # 少し待機
                time.sleep(5)
                
                print("📝 2回目投稿テスト...")
                success2 = post_tweet(driver, "永続プロファイルテスト2回目", None)
                print(f"🔍 2回目投稿結果: {success2}")
                
                if success2:
                    print("✅ 2回目投稿も成功！セッション維持確認済み")
                    return True
                else:
                    print("❌ 2回目投稿失敗")
                    return False
            else:
                print("❌ 初回投稿失敗")
                return False
        else:
            print("❌ ログインに失敗しました")
            return False
            
    except Exception as e:
        print(f"❌ テストエラー: {e}")
        return False
    finally:
        print("🔍 ブラウザを閉じますか？ (y/n)")
        close = input().lower().strip()
        if close == 'y':
            driver.quit()
        else:
            print("🔍 ブラウザは開いたままです")

def persistent_session_test():
    """永続セッションテスト（ヘッドレスモード）"""
    print("\n=== 永続セッションテスト（ヘッドレスモード） ===")
    
    driver = create_chrome_with_persistent_profile(headless=True)
    
    if not driver:
        print("❌ Chrome起動失敗")
        return False
    
    try:
        # ログイン状態確認
        is_logged_in = check_login_status(driver)
        print(f"🔍 永続セッションでのログイン状態: {is_logged_in}")
        
        if is_logged_in:
            print("✅ セッション永続化成功！投稿テスト...")
            success = post_tweet(driver, "永続セッションからの投稿テスト", None)
            print(f"🔍 投稿結果: {success}")
            return success
        else:
            print("❌ セッションが永続化されていません")
            return False
            
    except Exception as e:
        print(f"❌ テストエラー: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    print("どのテストを実行しますか？")
    print("1. 手動ログインテスト")
    print("2. 永続セッションテスト")
    print("3. 両方実行")
    
    choice = input("選択してください (1/2/3): ").strip()
    
    if choice == "1":
        manual_login_test()
    elif choice == "2":
        persistent_session_test()
    elif choice == "3":
        manual_login_test()
        print("\n" + "="*50)
        persistent_session_test()
    else:
        print("無効な選択です")