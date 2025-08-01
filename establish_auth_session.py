#!/usr/bin/env python3
"""
手動認証セッション確立スクリプト（ローカル実行用）
このスクリプトでTwitterにログインし、認証状態をDockerに転送する
"""

import sys
import time
import json
import sqlite3
import shutil
import os
from pathlib import Path

sys.path.append('/Users/takahashimika/Dropbox/web_kabu_ai/python')

def establish_manual_auth():
    """手動認証セッションを確立"""
    print("🔧 === 手動認証セッション確立 ===")
    print("ブラウザが開きます。Twitterに手動でログインしてください。")
    
    try:
        from python.twitter_auto_post.browser_manager import create_chrome_with_persistent_profile
        from python.twitter_auto_post.twitter_actions import check_login_status
        
        # ローカル環境でヘッドレスモードを無効にしてブラウザを起動
        print("🌐 ブラウザを起動中（手動ログイン用）...")
        driver = create_chrome_with_persistent_profile(headless=False)
        
        if not driver:
            print("❌ ブラウザ起動に失敗しました")
            return False
            
        try:
            print("🔍 Twitterログインページにアクセス中...")
            driver.get("https://x.com/login")
            time.sleep(2)
            
            print("\\n👤 === 手動ログイン実行 ===")
            print("1. ブラウザでTwitterにログインしてください")
            print("2. 必要に応じて電話番号/メール認証を完了してください") 
            print("3. ログイン完了後、Enterキーを押してください")
            
            input("ログイン完了後、Enterキーを押してください...")
            
            # ログイン状態を確認
            print("\\n🔍 ログイン状態を確認中...")
            is_logged_in = check_login_status(driver)
            
            if is_logged_in:
                print("✅ ログイン成功が確認されました！")
                
                # 認証状態を保存
                print("💾 認証状態を保存中...")
                
                # プロファイルディレクトリを取得
                profile_path = '/Users/takahashimika/Dropbox/web_kabu_ai/twitter_chrome_profile'
                
                # 認証Cookieを確認
                cookie_file = f'{profile_path}/Default/Cookies'
                if os.path.exists(cookie_file):
                    print(f"✅ 認証Cookieファイル保存完了: {cookie_file}")
                    
                    # Cookieの内容を確認
                    try:
                        conn = sqlite3.connect(cookie_file)
                        cursor = conn.cursor()
                        cursor.execute("SELECT COUNT(*) FROM cookies WHERE host_key LIKE '%x.com%' OR host_key LIKE '%twitter.com%'")
                        cookie_count = cursor.fetchone()[0]
                        print(f"✅ Twitter関連Cookie数: {cookie_count}")
                        conn.close()
                    except Exception as e:
                        print(f"⚠️ Cookie確認エラー: {e}")
                
                print("\\n🚀 次のステップ:")
                print("1. この認証状態をDockerコンテナに転送")
                print("2. Docker環境で自動投稿テストを実行")
                
                return True
            else:
                print("❌ ログインが確認できませんでした")
                print("再度ログインを試行してください")
                return False
                
        except Exception as e:
            print(f"❌ エラー: {e}")
            return False
            
        finally:
            print("\\nブラウザを閉じています...")
            try:
                driver.quit()
            except:
                pass
                
    except ImportError as e:
        print(f"❌ モジュールインポートエラー: {e}")
        print("Python環境を確認してください")
        return False
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
        return False

def transfer_auth_to_docker():
    """認証状態をDockerコンテナに転送"""
    print("\\n🔄 === 認証状態をDockerに転送 ===")
    
    local_profile = '/Users/takahashimika/Dropbox/web_kabu_ai/twitter_chrome_profile'
    
    if not os.path.exists(local_profile):
        print("❌ ローカル認証プロファイルが見つかりません")
        return False
    
    try:
        # Dockerコンテナに認証プロファイルをコピー
        import subprocess
        
        cmd = [
            'docker', 'cp', 
            local_profile,
            'twitter-auto-post-secure:/app/twitter_chrome_profile_auth'
        ]
        
        print("📁 Docker コンテナに認証プロファイルをコピー中...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 認証プロファイルの転送完了")
            
            # Dockerコンテナ内で認証プロファイルを置換
            docker_cmd = [
                'docker', 'exec', 'twitter-auto-post-secure',
                'bash', '-c',
                'rm -rf /app/twitter_chrome_profile && mv /app/twitter_chrome_profile_auth /app/twitter_chrome_profile && chown -R appuser:appuser /app/twitter_chrome_profile'
            ]
            
            replace_result = subprocess.run(docker_cmd, capture_output=True, text=True)
            
            if replace_result.returncode == 0:
                print("✅ Docker内認証プロファイル置換完了")
                return True
            else:
                print(f"❌ プロファイル置換失敗: {replace_result.stderr}")
                return False
        else:
            print(f"❌ 転送失敗: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ 転送エラー: {e}")
        return False

if __name__ == "__main__":
    print("🎯 Twitter手動認証セッション確立スクリプト")
    print("=" * 50)
    
    # Step 1: 手動認証セッション確立
    auth_success = establish_manual_auth()
    
    if auth_success:
        print("\\n✅ 手動認証セッション確立完了!")
        
        # Step 2: Dockerに転送
        transfer_success = transfer_auth_to_docker()
        
        if transfer_success:
            print("\\n🏆 === 完了 ===")
            print("✅ 手動認証セッション確立 & Docker転送完了")
            print("🚀 これでDocker環境で自動投稿テストが実行可能です")
        else:
            print("\\n⚠️ Docker転送に失敗しました")
            print("手動でプロファイルを転送してください")
    else:
        print("\\n❌ 手動認証セッション確立に失敗しました")
        print("再度実行してください")