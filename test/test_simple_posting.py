#!/usr/bin/env python3
"""シンプルな投稿テスト（改良版パスワード検出使用）"""

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

def find_password_input_advanced(driver):
    """改良されたパスワード入力欄検出"""
    print("改良版パスワード入力欄検出を開始...")
    
    # 従来の方法で試行
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
    
    print("パスワード入力欄が見つかりませんでした")
    return None

def test_simple_twitter_posting():
    """シンプルなTwitter投稿テスト"""
    print("シンプルな投稿テスト開始...")
    
    # Chrome オプション設定
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument(f'--user-data-dir=/tmp/test_chrome_{uuid.uuid4().hex[:8]}')
    
    driver = None
    try:
        # WebDriver作成
        driver = webdriver.Chrome(options=options)
        print("Chrome WebDriver起動成功")
        
        # Twitterログインページにアクセス
        driver.get("https://twitter.com/i/flow/login")
        time.sleep(3)
        
        # ユーザー名入力
        try:
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
            
        except Exception as e:
            print(f"ユーザー名入力エラー: {e}")
            return False
        
        # パスワード入力（改良版検出使用）
        print("改良版パスワード検出を実行...")
        password_input = find_password_input_advanced(driver)
        
        if password_input:
            print("改良版パスワード検出成功！")
            try:
                password_input.send_keys("***REMOVED_DB_PASSWORD***")
                password_input.send_keys(Keys.RETURN)
                print("パスワード入力完了")
                time.sleep(5)
                
                # ログイン成功確認
                current_url = driver.current_url
                print(f"ログイン後のURL: {current_url}")
                
                if "/home" not in current_url:
                    print("ログイン失敗")
                    return False
                
                print("ログイン成功！")
                
            except Exception as e:
                print(f"パスワード入力エラー: {e}")
                return False
        else:
            print("改良版パスワード検出失敗")
            return False
        
        # 投稿テスト
        print("投稿テスト開始...")
        
        try:
            # ツイート作成エリアを探す
            tweet_textarea = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            tweet_textarea.click()
            time.sleep(1)
            
            # シンプルなテスト投稿内容（絵文字なし）
            test_message = f"改良版パスワード検出システムでの投稿テスト成功! {time.strftime('%Y-%m-%d %H:%M:%S')}"
            tweet_textarea.send_keys(test_message)
            print(f"投稿内容入力完了: {test_message}")
            time.sleep(2)
            
            # 投稿ボタンを探してクリック
            post_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetButtonInline"]'))
            )
            post_button.click()
            print("投稿ボタンクリック完了")
            time.sleep(5)
            
            # 投稿成功確認
            current_url = driver.current_url
            if "/home" in current_url:
                print("投稿完了！ホームページに戻りました")
                return True
            else:
                print(f"投稿後のページ遷移に問題があります: {current_url}")
                return False
                
        except Exception as e:
            print(f"投稿エラー: {e}")
            return False
        
    except Exception as e:
        print(f"テストエラー: {e}")
        return False
        
    finally:
        if driver:
            driver.quit()
            print("WebDriver終了")

if __name__ == "__main__":
    result = test_simple_twitter_posting()
    print(f"最終結果: {'成功' if result else '失敗'}")
    if result:
        print("改良版パスワード検出システムでの投稿テストが成功しました！")
    else:
        print("投稿テストに失敗しました")