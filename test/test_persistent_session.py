#!/usr/bin/env python3
"""真の永続セッション管理 - ログイン状態を維持したまま連続投稿"""

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

# グローバルドライバー管理
PERSISTENT_DRIVER = None
PERSISTENT_PROFILE_PATH = "/tmp/twitter_persistent_session"

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

def get_or_create_persistent_driver():
    """永続ドライバーを取得または作成"""
    global PERSISTENT_DRIVER
    
    # 既存のドライバーがあり、まだ有効な場合はそれを返す
    if PERSISTENT_DRIVER:
        try:
            # ドライバーが生きているかテスト
            current_url = PERSISTENT_DRIVER.current_url
            print(f"✅ 既存ドライバー再利用: {current_url}")
            return PERSISTENT_DRIVER
        except:
            print("❌ 既存ドライバーが無効、新規作成します")
            PERSISTENT_DRIVER = None
    
    # 新規ドライバー作成
    print("🔧 新規永続ドライバーを作成...")
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    
    # 永続プロファイルディレクトリを使用
    os.makedirs(PERSISTENT_PROFILE_PATH, exist_ok=True)
    options.add_argument(f'--user-data-dir={PERSISTENT_PROFILE_PATH}')
    options.add_argument('--profile-directory=Default')
    
    # セッション保持のための設定
    options.add_argument('--disable-background-timer-throttling')
    options.add_argument('--disable-renderer-backgrounding')
    options.add_argument('--disable-backgrounding-occluded-windows')
    
    PERSISTENT_DRIVER = webdriver.Chrome(options=options)
    print("✅ 新規永続ドライバー作成完了")
    return PERSISTENT_DRIVER

def check_if_on_home_page(driver):
    """ホームページ（投稿画面）にいるかチェック"""
    try:
        current_url = driver.current_url
        print(f"現在のURL: {current_url}")
        
        # ホームページのURLパターンをチェック
        if "/home" in current_url and "login" not in current_url:
            # ツイート入力エリアがあるかチェック
            try:
                tweet_area = driver.find_element(By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]')
                if tweet_area.is_displayed():
                    print("✅ 投稿画面に既にいます")
                    return True
            except:
                pass
        
        print("❌ 投稿画面にいません")
        return False
        
    except Exception as e:
        print(f"ページ状態確認エラー: {e}")
        return False

def perform_login_if_needed(driver):
    """必要な場合のみログイン処理を実行"""
    try:
        # まずホームページにアクセスして状態確認
        print("🔍 ログイン状態を確認中...")
        driver.get("https://twitter.com/home")
        time.sleep(3)
        
        # 既に投稿画面にいるかチェック
        if check_if_on_home_page(driver):
            print("✅ 既にログイン済みで投稿画面にいます")
            return True
        
        # ログインが必要な場合
        print("🔐 ログインが必要です。ログイン処理を開始...")
        
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
            
            # ログイン後ホームページに移動
            driver.get("https://twitter.com/home")
            time.sleep(3)
            
            # ログイン成功確認
            if check_if_on_home_page(driver):
                print("✅ ログイン成功し、投稿画面に到達")
                return True
            else:
                print("❌ ログイン後の投稿画面確認失敗")
                return False
        else:
            print("❌ パスワード入力欄が見つかりません")
            return False
            
    except Exception as e:
        print(f"ログイン処理エラー: {e}")
        return False

def post_tweet_on_current_page(driver, message):
    """現在のページ（投稿画面）でツイートを投稿"""
    try:
        print(f"📝 投稿開始: {message}")
        
        # 投稿画面にいることを確認
        if not check_if_on_home_page(driver):
            print("❌ 投稿画面にいません。ホームページに移動します...")
            driver.get("https://twitter.com/home")
            time.sleep(2)
            
            if not check_if_on_home_page(driver):
                print("❌ ホームページへの移動に失敗")
                return False
        
        # ツイート入力エリアをクリック
        tweet_textarea = WebDriverWait(driver, 5).until(
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

def test_true_persistent_session():
    """真の永続セッション管理テスト"""
    print("=== 真の永続セッション管理テスト開始 ===")
    
    try:
        # 永続ドライバーを取得
        driver = get_or_create_persistent_driver()
        
        # 1回目: ログイン状態確認 & 必要に応じてログイン
        print("\n--- 1回目: ログイン処理 ---")
        login_success = perform_login_if_needed(driver)
        
        if not login_success:
            print("❌ ログインに失敗しました")
            return False
        
        # 1回目投稿
        print("\n--- 1回目投稿 ---")
        message1 = f"1回目投稿: 永続セッション管理テスト {time.strftime('%H:%M:%S')}"
        post1_success = post_tweet_on_current_page(driver, message1)
        
        if not post1_success:
            print("❌ 1回目投稿に失敗")
            return False
        
        print("✅ 1回目投稿成功")
        
        # 少し待機（投稿画面はそのまま）
        print("\n--- 待機中 (投稿画面維持) ---")
        time.sleep(5)
        
        # 2回目: セッション維持状態で投稿（ログインし直さない）
        print("\n--- 2回目: セッション維持での投稿 ---")
        current_url = driver.current_url
        print(f"セッション維持確認 - 現在のURL: {current_url}")
        
        # 投稿画面にいることを確認
        if check_if_on_home_page(driver):
            print("✅ セッションが維持され、投稿画面にいます")
        else:
            print("❌ セッションが切れています。再ログインします...")
            login_success = perform_login_if_needed(driver)
            if not login_success:
                print("❌ 再ログインに失敗")
                return False
        
        # 2回目投稿（そのまま投稿画面で）
        message2 = f"2回目投稿: セッション維持での連続投稿 {time.strftime('%H:%M:%S')}"
        post2_success = post_tweet_on_current_page(driver, message2)
        
        if post2_success:
            print("✅ 2回目投稿成功")
            print("🎉 真の永続セッション管理による連続投稿が成功しました！")
            print("💡 重要: ドライバーはそのまま維持され、次回はログイン不要で投稿可能です")
            return True
        else:
            print("❌ 2回目投稿に失敗")
            return False
            
    except Exception as e:
        print(f"テストエラー: {e}")
        return False
        
    # 注意: ドライバーはGLOBAL変数として維持されるため、終了させない

def cleanup_driver():
    """ドライバーをクリーンアップ（必要時のみ）"""
    global PERSISTENT_DRIVER
    if PERSISTENT_DRIVER:
        try:
            PERSISTENT_DRIVER.quit()
            print("ドライバー終了")
        except:
            pass
        PERSISTENT_DRIVER = None

if __name__ == "__main__":
    result = test_true_persistent_session()
    print(f"\n📊 最終結果: {'成功' if result else '失敗'}")
    if result:
        print("🎉 永続セッション管理による連続投稿が成功しました！")
        print("💡 次回実行時はログイン不要で投稿画面から開始できます")
    else:
        print("❌ 永続セッション管理に失敗しました")
        
    # テスト用なのでドライバーを終了
    # 実際の運用では維持する
    cleanup_driver()