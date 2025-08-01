#!/usr/bin/env python3
"""
手動認証セッション確立スクリプト
一度だけ手動でログインし、認証状態を保存する
"""

import sys
import time
sys.path.append('/Users/takahashimika/Dropbox/web_kabu_ai/python')

def setup_manual_auth():
    """手動でTwitterにログインしてセッションを保存"""
    from python.twitter_auto_post.browser_manager import create_chrome_with_persistent_profile
    from python.twitter_auto_post.twitter_actions import check_login_status
    
    print("🔧 === 手動認証セッション確立 ===")
    print("このスクリプトは一度だけ実行してください")
    print("ブラウザが開いたら手動でTwitterにログインしてください")
    
    # ヘッドレスモードを無効にして手動ログイン用ブラウザを起動
    driver = create_chrome_with_persistent_profile(headless=False)
    
    if not driver:
        print("❌ ブラウザ起動に失敗しました")
        return False
    
    try:
        print("🌐 Twitterにアクセス中...")
        driver.get("https://x.com/login")
        
        print("👤 手動でTwitterにログインしてください")
        print("ログイン完了後、Enterキーを押してください...")
        input()
        
        # ログイン状態を確認
        is_logged_in = check_login_status(driver)
        
        if is_logged_in:
            print("✅ ログイン成功！セッションが保存されました")
            print("今後は自動投稿が可能になります")
            return True
        else:
            print("❌ ログインが確認できませんでした")
            return False
            
    except Exception as e:
        print(f"❌ エラー: {e}")
        return False
        
    finally:
        print("ブラウザを閉じています...")
        driver.quit()

if __name__ == "__main__":
    success = setup_manual_auth()
    if success:
        print("\n✅ 手動認証セッション確立完了")
        print("これで自動投稿テストが実行可能になりました")
    else:
        print("\n❌ 手動認証セッション確立に失敗しました")
        print("再度実行してください")