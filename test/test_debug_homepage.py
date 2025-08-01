#!/usr/bin/env python3
"""ホームページ（投稿画面）の詳細デバッグ"""

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
    traditional_selectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[autocomplete="current-password"]'
    ]
    
    for selector in traditional_selectors:
        try:
            password_input = WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            if password_input.is_displayed() and password_input.is_enabled():
                return password_input
        except:
            continue
    return None

def debug_homepage_elements(driver):
    """ホームページの要素を詳細デバッグ"""
    print("=== ホームページ要素デバッグ ===")
    
    try:
        current_url = driver.current_url
        page_title = driver.title
        print(f"現在のURL: {current_url}")
        print(f"ページタイトル: {page_title}")
        
        # ツイートエリア関連の要素を探す
        tweet_selectors = [
            '[data-testid="tweetTextarea_0"]',
            '[data-testid="tweetButton"]',
            '[data-testid="tweetButtonInline"]',
            'div[role="textbox"]',
            'div[data-testid="tweetTextarea_0"]'
        ]
        
        print("\n🔍 ツイート関連要素の検索:")
        for selector in tweet_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    element = elements[0]
                    is_displayed = element.is_displayed()
                    is_enabled = element.is_enabled()
                    print(f"✅ 発見: {selector} (表示: {is_displayed}, 有効: {is_enabled})")
                else:
                    print(f"❌ 未発見: {selector}")
            except Exception as e:
                print(f"❌ エラー: {selector} - {e}")
        
        # ナビゲーション関連要素
        nav_selectors = [
            '[data-testid="SideNav_AccountSwitcher_Button"]',
            '[data-testid="SideNav_NewTweet_Button"]',  
            '[data-testid="primaryColumn"]',
            'nav[role="navigation"]',
            'header[role="banner"]'
        ]
        
        print("\n🔍 ナビゲーション要素の検索:")
        for selector in nav_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"✅ 発見: {selector}")
                else:
                    print(f"❌ 未発見: {selector}")
            except Exception as e:
                print(f"❌ エラー: {selector} - {e}")
        
        # 全体的なページ構造をチェック
        print("\n🔍 全体的なページ構造:")
        try:
            all_divs = driver.find_elements(By.TAG_NAME, "div")
            print(f"div要素数: {len(all_divs)}")
            
            all_inputs = driver.find_elements(By.TAG_NAME, "input")
            print(f"input要素数: {len(all_inputs)}")
            
            # data-testid属性を持つ要素を探す
            testid_elements = driver.find_elements(By.CSS_SELECTOR, "[data-testid]")
            print(f"data-testid要素数: {len(testid_elements)}")
            
            # 最初の10個のdata-testid値を表示
            print("最初の10個のdata-testid値:")
            for i, elem in enumerate(testid_elements[:10]):
                try:
                    testid = elem.get_attribute("data-testid")
                    print(f"  {i+1}: {testid}")
                except:
                    pass
                    
        except Exception as e:
            print(f"全体構造チェックエラー: {e}")
        
        print("=== デバッグ完了 ===")
        
    except Exception as e:
        print(f"デバッグエラー: {e}")

def test_homepage_debug():
    """ホームページデバッグテスト"""
    print("🔍 ホームページデバッグテスト開始...")
    
    # Chrome オプション設定
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    
    profile_path = f"/tmp/debug_profile_{uuid.uuid4().hex[:8]}"
    options.add_argument(f'--user-data-dir={profile_path}')
    
    driver = None
    try:
        driver = webdriver.Chrome(options=options)
        print("✅ Chrome WebDriver起動成功")
        
        # ログイン処理
        print("\n--- ログイン処理 ---")
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
        
        # パスワード入力
        password_input = find_password_input_advanced(driver)
        if password_input:
            password_input.send_keys("***REMOVED_DB_PASSWORD***")
            password_input.send_keys(Keys.RETURN)
            print("パスワード入力完了")
            time.sleep(5)
        
        # ホームページに移動
        print("\n--- ホームページに移動 ---")
        driver.get("https://twitter.com/home")
        time.sleep(5)  # 十分な待機時間
        
        # ホームページの詳細デバッグ
        debug_homepage_elements(driver)
        
        return True
        
    except Exception as e:
        print(f"テストエラー: {e}")
        return False
        
    finally:
        if driver:
            driver.quit()
            print("WebDriver終了")

if __name__ == "__main__":
    test_homepage_debug()