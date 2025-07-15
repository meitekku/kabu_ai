import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import os

from .text_input import input_text_with_events
from .config import TWITTER_USERNAME, TWITTER_PASSWORD

def find_tweet_button(driver):
    """投稿ボタンを複数の方法で探す"""
    selectors = [
        '[data-testid="tweetButtonInline"]',
        '[data-testid="tweetButton"]',
        'button[data-testid*="tweet"]',
        'div[role="button"][tabindex="0"] span:contains("Post")',
        'div[role="button"][tabindex="0"] span:contains("ポスト")'
    ]
    
    for selector in selectors:
        try:
            if ':contains' not in selector:
                button = driver.find_element(By.CSS_SELECTOR, selector)
                if button and button.is_displayed() and button.is_enabled():
                    return button
        except:
            pass
    
    xpath_selectors = [
        "//div[@role='button']//span[text()='Post']",
        "//div[@role='button']//span[text()='ポスト']",
        "//button[contains(@data-testid, 'tweet')]"
    ]
    
    for xpath in xpath_selectors:
        try:
            button = driver.find_element(By.XPATH, xpath)
            if button and button.is_displayed() and button.is_enabled():
                return button
        except:
            pass
    
    try:
        script = """
        var buttons = document.querySelectorAll('div[role="button"], button');
        for (var btn of buttons) {
            var text = btn.textContent || btn.innerText || '';
            if (text === 'Post' || text === 'ポスト' || text.includes('Post') || text.includes('ポスト')) {
                var rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && btn.offsetParent !== null) {
                    return btn;
                }
            }
        }
        return null;
        """
        button = driver.execute_script(script)
        if button:
            return button
    except:
        pass
    
    return None

def check_login_status(driver):
    """ログイン状態をチェックする（セッション管理強化版）"""
    try:
        print("ログイン状態をチェック中...")
        
        # セッション有効性を確認
        try:
            current_url = driver.current_url
            print(f"🔍 現在のURL: {current_url}")
        except Exception as e:
            print(f"❌ セッション切断検出: {e}")
            return False
        
        # ホームページに移動（セッション確認のため）
        try:
            if "/home" not in current_url:
                print("🔍 ホームページに移動中...")
                driver.get("https://twitter.com/home")
                time.sleep(3)  # 読み込み時間を増やす
                
                # ページ読み込み完了を待機
                WebDriverWait(driver, 30).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
        except Exception as e:
            print(f"❌ ホームページ移動失敗: {e}")
            return False
        
        # ログイン状態の確認（複数の方法を試行）
        login_indicators = [
            # 方法1: アカウント切り替えボタン
            '[data-testid="SideNav_AccountSwitcher_Button"]',
            # 方法2: ツイートエリア
            '[data-testid="tweetTextarea_0"]',
            # 方法3: メニューボタン
            '[data-testid="SideNav_NewTweet_Button"]',
            # 方法4: ホームタイムライン
            '[data-testid="primaryColumn"]'
        ]
        
        for i, selector in enumerate(login_indicators):
            try:
                print(f"🔍 ログイン確認方法 {i+1}: {selector}")
                element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                if element.is_displayed():
                    print("✅ 既にログイン済みです")
                    return True
            except Exception as e:
                print(f"  ❌ 方法 {i+1} 失敗: {e}")
                continue
        
        # URLベースのログイン確認
        try:
            current_url = driver.current_url
            print(f"🔍 URL再確認: {current_url}")
            
            if "login" in current_url or "i/flow/login" in current_url:
                print("❌ ログインが必要です（URLベース）")
                return False
            
            # ログインボタンの存在確認
            login_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'ログイン') or contains(text(), 'Log in') or contains(text(), 'Sign in')]")
            if login_elements:
                print("❌ ログインが必要です（ログインボタン検出）")
                return False
        except:
            pass
        
        print("⚠️ ログイン状態が不明です - ログインを試行します")
        return False
        
    except Exception as e:
        print(f"❌ ログイン状態チェックエラー: {e}")
        return False

def twitter_login(driver, username=TWITTER_USERNAME, password=TWITTER_PASSWORD):
    """Twitterにログイン"""
    try:
        print(f"Twitterログインページへアクセス... (ユーザー: {username})")
        
        driver.get("https://twitter.com/login")
        time.sleep(1)
        
        # ユーザー名入力
        username_input = WebDriverWait(driver, 3).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
        )
        username_input.clear()
        username_input.send_keys(username)
        username_input.send_keys(Keys.RETURN)
        time.sleep(0.3)
        
        # 電話番号/メール確認画面の確認
        try:
            WebDriverWait(driver, 1).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[data-testid="ocfEnterTextTextInput"]'))
            )
            print("❌ 電話番号/メール確認が必要です。手動で入力してください...")
            return False
        except:
            pass
        
        # パスワード入力
        password_input = WebDriverWait(driver, 3).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[type="password"]'))
        )
        password_input.clear()
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)
        time.sleep(0.5)
        
        # ログイン成功確認
        try:
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="SideNav_AccountSwitcher_Button"]'))
            )
            print("✅ ログイン成功！")
            return True
        except:
            print("❌ ログイン失敗")
            return False
        
    except Exception as e:
        print(f"❌ ログインエラー: {e}")
        return False

def post_tweet(driver, message, image_path=None):
    """ツイートを投稿（画像付きまたはテキストのみ）"""
    try:
        print(f"ツイート投稿中: {message}")
        
        # ホームページへ移動
        current_url = driver.current_url
        if "/home" not in current_url:
            driver.get("https://twitter.com/home")
            time.sleep(1)
        
        # ツイート入力エリアをクリック
        tweet_textarea = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
        )
        tweet_textarea.click()
        time.sleep(0.5)
        
        # テキスト入力
        text_input_success = input_text_with_events(driver, tweet_textarea, message)
        
        # 画像アップロード（指定がある場合）
        if image_path and os.path.exists(image_path):
            try:
                file_input = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="file"][accept*="image"]'))
                )
                file_input.send_keys(os.path.abspath(image_path))
                time.sleep(3)
                
                # アップロード完了確認
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="media"]'))
                )
            except Exception as e:
                print(f"画像アップロードエラー: {e}")
        
        time.sleep(0.5)
        
        # 投稿ボタンをクリック
        post_button = find_tweet_button(driver)
        if not post_button:
            raise Exception("投稿ボタンが見つかりません")
        
        driver.execute_script("arguments[0].click();", post_button)
        time.sleep(5)
        
        # 投稿完了確認
        try:
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
            )
            print("✅ ツイート投稿完了！")
            return True
        except:
            print("⚠️ 投稿完了の確認ができませんでしたが、投稿ボタンはクリックしました")
            return True
        
    except Exception as e:
        print(f"❌ 投稿エラー: {e}")
        return False 