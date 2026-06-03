#!/usr/bin/env python3
"""セッション再利用による2回目投稿テスト"""

import os
import sys
import time
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

# グローバル変数でプロファイルパスを管理
PERSISTENT_PROFILE_PATH = "/tmp/twitter_persistent_profile"

def find_password_input_advanced(driver):
    """改良されたパスワード入力欄検出"""
    print("改良版パスワード入力欄検出を開始...")
    
    traditional_selectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[autocomplete="current-password"]'
    ]
    
    for selector in traditional_selectors:
        try:
            print(f"従来セレクタを試行: {selector}")
            password_input = WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            if password_input.is_displayed() and password_input.is_enabled():
                print(f"従来セレクタで発見: {selector}")
                return password_input
        except:
            continue
    
    return None

def create_persistent_driver():
    """永続的なプロファイルを使用するドライバーを作成"""
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    
    # 永続的なプロファイルディレクトリを使用
    options.add_argument(f'--user-data-dir={PERSISTENT_PROFILE_PATH}')
    options.add_argument('--profile-directory=Default')
    
    # セッション保持のための設定
    options.add_argument('--disable-background-timer-throttling')
    options.add_argument('--disable-renderer-backgrounding')
    options.add_argument('--disable-backgrounding-occluded-windows')
    
    return webdriver.Chrome(options=options)

def check_login_status(driver):
    """ログイン状態を確認"""
    try:
        # ホームページにアクセス
        driver.get("https://twitter.com/home")
        time.sleep(3)
        
        current_url = driver.current_url
        print(f"現在のURL: {current_url}")
        
        # ログイン済みかチェック
        if "/home" in current_url:
            print("✅ 既にログイン済みです")
            return True
        elif "/login" in current_url or "/i/flow/login" in current_url:
            print("❌ ログインが必要です")
            return False
        else:
            # ログイン関連の要素があるかチェック
            try:
                # ログイン済みユーザーにのみ表示される要素をチェック
                driver.find_element(By.CSS_SELECTOR, '[data-testid="SideNav_AccountSwitcher_Button"]')
                print("✅ ログイン済み（サイドナビ確認）")
                return True
            except:
                try:
                    driver.find_element(By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]')
                    print("✅ ログイン済み（ツイートエリア確認）")
                    return True
                except:
                    print("❌ ログイン状態の確認ができません")
                    return False
    except Exception as e:
        print(f"ログイン状態確認エラー: {e}")
        return False

def perform_login(driver):
    """ログイン処理を実行"""
    print("ログイン処理を開始...")
    
    try:
        # ログインページにアクセス
        driver.get("https://twitter.com/i/flow/login")
        time.sleep(3)
        
        # ユーザー名入力
        username_input = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
        )
        username_input.send_keys("meiteko_stock")
        print("ユーザー名入力完了")
        
        # Next ボタンクリック
        next_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//span[text()='Next']"))
        )
        next_button.click()
        time.sleep(3)
        
        # パスワード入力（改良版検出使用）
        password_input = find_password_input_advanced(driver)
        if password_input:
            password_input.send_keys(os.environ['TWITTER_PASSWORD'])
            password_input.send_keys(Keys.RETURN)
            print("パスワード入力完了")
            time.sleep(5)
            
            # ログイン成功確認
            current_url = driver.current_url
            if "/home" in current_url:
                print("✅ ログイン成功")
                return True
            else:
                print("❌ ログイン失敗")
                return False
        else:
            print("❌ パスワード入力欄が見つかりません")
            return False
            
    except Exception as e:
        print(f"ログインエラー: {e}")
        return False

def post_tweet(driver, message):
    """ツイートを投稿"""
    try:
        print(f"投稿開始: {message}")
        
        # ホームページに移動（既にログイン済みの場合）
        driver.get("https://twitter.com/home")
        time.sleep(2)
        
        # ツイート作成エリアを探す
        tweet_textarea = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
        )
        tweet_textarea.click()
        time.sleep(1)
        
        # 既存のテキストをクリア
        tweet_textarea.clear()
        
        # メッセージを入力
        tweet_textarea.send_keys(message)
        print(f"投稿内容入力完了: {message}")
        time.sleep(2)
        
        # 投稿ボタンをクリック
        post_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetButtonInline"]'))
        )
        post_button.click()
        print("投稿ボタンクリック完了")
        time.sleep(3)
        
        print("✅ 投稿完了")
        return True
        
    except Exception as e:
        print(f"投稿エラー: {e}")
        return False

def test_session_reuse_posting():
    """セッション再利用による投稿テスト"""
    print("=== セッション再利用投稿テスト開始 ===")
    
    # プロファイルディレクトリを作成
    os.makedirs(PERSISTENT_PROFILE_PATH, exist_ok=True)
    
    driver = None
    try:
        # 永続プロファイルでドライバー作成
        driver = create_persistent_driver()
        print("✅ 永続プロファイルでChrome WebDriver起動成功")
        
        # 1回目: ログイン状態確認とログイン
        print("\n--- 1回目: ログイン状態確認 ---")
        is_logged_in = check_login_status(driver)
        
        if not is_logged_in:
            print("ログインが必要です。ログイン処理を実行します...")
            login_success = perform_login(driver)
            if not login_success:
                print("❌ ログインに失敗しました")
                return False
        
        # 1回目投稿
        print("\n--- 1回目投稿 ---")
        message1 = f"1回目投稿: セッション管理テスト開始 {time.strftime('%H:%M:%S')}"
        post1_success = post_tweet(driver, message1)
        
        if not post1_success:
            print("❌ 1回目投稿に失敗")
            return False
        
        print("✅ 1回目投稿成功")
        
        # 少し待機
        time.sleep(3)
        
        # 2回目: セッション維持状態で投稿
        print("\n--- 2回目: セッション維持確認 ---")
        is_still_logged_in = check_login_status(driver)
        
        if is_still_logged_in:
            print("✅ セッションが維持されています")
        else:
            print("❌ セッションが切れています")
            return False
        
        # 2回目投稿
        print("\n--- 2回目投稿 ---")
        message2 = f"2回目投稿: セッション維持での投稿成功 {time.strftime('%H:%M:%S')}"
        post2_success = post_tweet(driver, message2)
        
        if post2_success:
            print("✅ 2回目投稿成功")
            print("🎉 セッション再利用による連続投稿が成功しました！")
            return True
        else:
            print("❌ 2回目投稿に失敗")
            return False
            
    except Exception as e:
        print(f"テストエラー: {e}")
        return False
        
    finally:
        if driver:
            # セッションを保持するためにドライバーを終了しない場合は
            # driver.quit() をコメントアウト
            print("セッション保持のため、ドライバーは終了せずに維持します")
            # driver.quit()

if __name__ == "__main__":
    result = test_session_reuse_posting()
    print(f"\n📊 最終結果: {'成功' if result else '失敗'}")
    if result:
        print("🎉 永続プロファイルを使用したセッション管理と連続投稿が成功しました！")
    else:
        print("❌ セッション管理または投稿に失敗しました")