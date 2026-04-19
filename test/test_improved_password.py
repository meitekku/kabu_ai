#!/usr/bin/env python3
"""改良版パスワード検出の直接テスト"""

import os
import sys
import time
import tempfile
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

# パスに追加
sys.path.append('/app/python')

def find_password_input_advanced(driver):
    """改良されたパスワード入力欄検出"""
    print("🔍 改良版パスワード入力欄検出を開始...")
    
    # 1. まず従来の方法で試行
    traditional_selectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[autocomplete="current-password"]',
        'input[placeholder*="password"]',
        'input[placeholder*="パスワード"]',
        'input[aria-label*="password"]',
        'input[aria-label*="パスワード"]'
    ]
    
    for selector in traditional_selectors:
        try:
            print(f"🔍 従来セレクタを試行: {selector}")
            password_input = WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            if password_input.is_displayed() and password_input.is_enabled():
                print(f"✅ 従来セレクタで発見: {selector}")
                return password_input
        except:
            continue
    
    # 2. より詳細なJavaScript検索
    print("🔍 JavaScript詳細検索を実行...")
    try:
        password_input = driver.execute_script("""
            // 改良されたパスワード入力欄検索
            var allInputs = document.querySelectorAll('input');
            console.log('Total inputs found:', allInputs.length);
            
            var candidates = [];
            
            for (var i = 0; i < allInputs.length; i++) {
                var input = allInputs[i];
                var rect = input.getBoundingClientRect();
                var styles = window.getComputedStyle(input);
                
                // 可視性をチェック
                if (rect.width === 0 || rect.height === 0 || 
                    styles.display === 'none' || 
                    styles.visibility === 'hidden' || 
                    styles.opacity === '0') {
                    continue;
                }
                
                var score = 0;
                var type = input.type ? input.type.toLowerCase() : '';
                var name = input.name ? input.name.toLowerCase() : '';
                var id = input.id ? input.id.toLowerCase() : '';
                var autocomplete = input.autocomplete ? input.autocomplete.toLowerCase() : '';
                var placeholder = input.placeholder ? input.placeholder.toLowerCase() : '';
                var ariaLabel = input.getAttribute('aria-label') ? input.getAttribute('aria-label').toLowerCase() : '';
                
                // スコアリング
                if (type === 'password') score += 100;
                if (name.includes('password') || name.includes('pass')) score += 80;
                if (id.includes('password') || id.includes('pass')) score += 70;
                if (autocomplete.includes('password') || autocomplete.includes('current-password')) score += 90;
                if (placeholder.includes('password') || placeholder.includes('パスワード')) score += 60;
                if (ariaLabel.includes('password') || ariaLabel.includes('パスワード')) score += 60;
                
                // 親要素のテキストもチェック
                var parentText = input.parentElement ? input.parentElement.textContent.toLowerCase() : '';
                if (parentText.includes('password') || parentText.includes('パスワード')) score += 30;
                
                // ラベル要素をチェック
                var label = document.querySelector('label[for="' + input.id + '"]');
                if (label) {
                    var labelText = label.textContent.toLowerCase();
                    if (labelText.includes('password') || labelText.includes('パスワード')) score += 50;
                }
                
                if (score > 0) {
                    candidates.push({element: input, score: score, info: {type, name, id, autocomplete, placeholder, ariaLabel}});
                }
            }
            
            if (candidates.length === 0) return null;
            
            // 最高スコアの要素を返す
            candidates.sort((a, b) => b.score - a.score);
            console.log('Best candidate score:', candidates[0].score, candidates[0].info);
            return candidates[0].element;
        """)
        
        if password_input:
            print("✅ JavaScript詳細検索で発見")
            return password_input
            
    except Exception as e:
        print(f"❌ JavaScript検索エラー: {e}")
    
    print("❌ パスワード入力欄が見つかりませんでした")
    return None

def test_twitter_login():
    """Twitterログインテスト"""
    print("🔍 改良版パスワード検出テスト開始...")
    
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
        print("✅ Chrome WebDriver起動成功")
        
        # Twitterログインページにアクセス
        driver.get("https://twitter.com/i/flow/login")
        time.sleep(3)
        
        print(f"現在のURL: {driver.current_url}")
        
        # ユーザー名入力
        try:
            username_input = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
            )
            username_input.send_keys("meiteko_stock")
            print("✅ ユーザー名入力完了")
            
            # Next ボタンクリック
            next_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//span[text()='Next']"))
            )
            next_button.click()
            time.sleep(3)
            
        except Exception as e:
            print(f"❌ ユーザー名入力エラー: {e}")
            return False
        
        # パスワード入力欄を改良版で検出
        print("🔍 改良版パスワード検出を実行...")
        password_input = find_password_input_advanced(driver)
        
        if password_input:
            print("✅ 改良版パスワード検出成功！")
            try:
                password_input.send_keys(os.environ['TWITTER_PASSWORD'])
                password_input.send_keys(Keys.RETURN)
                print("✅ パスワード入力完了")
                time.sleep(3)
                
                # ログイン成功確認
                current_url = driver.current_url
                print(f"ログイン後のURL: {current_url}")
                
                if "/home" in current_url:
                    print("✅ ログイン成功！")
                    return True
                else:
                    print("❌ ログイン失敗またはさらなる認証が必要")
                    return False
                    
            except Exception as e:
                print(f"❌ パスワード入力エラー: {e}")
                return False
        else:
            print("❌ 改良版パスワード検出失敗")
            return False
        
    except Exception as e:
        print(f"❌ テストエラー: {e}")
        return False
        
    finally:
        if driver:
            driver.quit()
            print("✅ WebDriver終了")

if __name__ == "__main__":
    result = test_twitter_login()
    print(f"📊 最終結果: {'成功' if result else '失敗'}")