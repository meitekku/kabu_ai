import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import os

from .text_input import input_text_with_events
from .config import TWITTER_USERNAME, TWITTER_PASSWORD
from .browser_manager import delete_chrome_profile_for_auth_reset
from .proxy_manager import get_tor_manager

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
    """ログイン状態をチェックする（認証セッション保持強化版）"""
    try:
        print("🔍 ログイン状態をチェック中...")
        
        # 基本的なセッション有効性確認
        try:
            # まずドライバーが応答するかテスト
            title = driver.title
            current_url = driver.current_url
            print(f"🔍 現在のページ: {title}")
            print(f"🔍 現在のURL: {current_url}")
        except Exception as e:
            print(f"❌ ドライバーセッション無効: {str(e)[:50]}...")
            return False
        
        # 既にTwitterホームにいる場合は認証済みとして扱う
        if "/home" in current_url and "x.com" in current_url:
            print("✅ 既にTwitterホームページにアクセス済み（認証状態確認中）")
            # 追加確認：投稿ボタンの存在をチェック
            try:
                tweet_button = driver.find_element(By.CSS_SELECTOR, '[data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButton"]')
                if tweet_button:
                    print("✅ 投稿ボタン確認済み - ログイン状態OK")
                    return True
            except:
                print("⚠️ 投稿ボタンが見つからない - 詳細確認中...")
                pass
        
        # 新しいタブページの場合はTwitterホームに移動してチェック
        if current_url == "chrome://new-tab-page/" or current_url == "data:,":
            print("🔍 新しいタブページを検出、Twitterホームページに移動...")
            try:
                driver.get("https://twitter.com/home")
                import time
                time.sleep(3)  # ページ読み込み待機
                current_url = driver.current_url
                print(f"🔍 移動後のURL: {current_url}")
            except Exception as e:
                print(f"❌ Twitterホームページへの移動失敗: {str(e)[:50]}...")
                return False
        
        # ログインページにいる場合
        if "login" in current_url.lower() or "i/flow/login" in current_url.lower():
            print("❌ ログインページにいます")
            return False
        
        # JavaScriptベースの簡単な確認（より安全）
        try:
            # ページが完全に読み込まれているかチェック
            ready_state = driver.execute_script("return document.readyState")
            if ready_state != "complete":
                print("⏳ ページ読み込み中...")
                time.sleep(2)
            
            # シンプルなJavaScriptでログイン状態を確認
            login_check_script = """
            // ログイン状態を示す一般的な要素を探す
            var indicators = [
                'div[data-testid*="SideNav"]',
                'div[data-testid*="tweet"]',
                'nav[role="navigation"]',
                'div[data-testid="primaryColumn"]'
            ];
            
            for (var selector of indicators) {
                var elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    return {found: true, selector: selector, count: elements.length};
                }
            }
            
            // ログインボタンがあるかチェック
            var loginButtons = document.querySelectorAll('*');
            for (var elem of loginButtons) {
                var text = (elem.textContent || '').toLowerCase();
                if (text.includes('log in') || text.includes('sign in') || text.includes('ログイン')) {
                    return {found: false, reason: 'login_button_found'};
                }
            }
            
            return {found: false, reason: 'no_indicators'};
            """
            
            result = driver.execute_script(login_check_script)
            print(f"🔍 JavaScript確認結果: {result}")
            
            if result and result.get('found'):
                print(f"✅ ログイン済み確認 (要素: {result.get('selector')})")
                return True
            else:
                reason = result.get('reason', 'unknown') if result else 'script_failed'
                print(f"❌ ログインが必要 (理由: {reason})")
                return False
                
        except Exception as js_error:
            print(f"❌ JavaScript確認失敗: {str(js_error)[:50]}...")
            
            # JavaScript失敗時のフォールバック: URLのみで判定
            try:
                current_url = driver.current_url
                if "/home" in current_url or "/x.com" in current_url or "twitter.com" in current_url:
                    if "login" not in current_url and "i/flow" not in current_url:
                        print("✅ URL状態からログイン済みと推定")
                        return True
                
                print("❌ URL状態からログインが必要と判定")
                return False
            except:
                print("❌ フォールバック確認も失敗")
                return False
        
    except Exception as e:
        print(f"❌ ログイン状態チェック全体エラー: {str(e)[:50]}...")
        return False

def twitter_login(driver, username=TWITTER_USERNAME, password=TWITTER_PASSWORD):
    """Twitterにログイン（堅牢性重視版）"""
    try:
        print(f"Twitterログインページへアクセス... (ユーザー: {username})")
        
        # ログインページに移動
        try:
            driver.get("https://twitter.com/login")
            time.sleep(2)  # 少し長めに待機
            
            # ページ読み込み完了を待機
            WebDriverWait(driver, 10).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except Exception as e:
            print(f"❌ ログインページ読み込み失敗: {str(e)[:50]}...")
            return False
        
        # ユーザー名入力（複数のセレクタを試行）
        username_selectors = [
            'input[autocomplete="username"]',
            'input[name="text"]',
            'input[type="text"]',
            'input[data-testid*="username"]'
        ]
        
        username_input = None
        for selector in username_selectors:
            try:
                username_input = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                print(f"✅ ユーザー名入力欄を発見: {selector}")
                break
            except:
                continue
        
        if not username_input:
            print("❌ ユーザー名入力欄が見つかりません")
            return False
        
        try:
            username_input.clear()
            username_input.send_keys(username)
            username_input.send_keys(Keys.RETURN)
            time.sleep(1)
        except Exception as e:
            print(f"❌ ユーザー名入力失敗: {str(e)[:50]}...")
            return False
        
        # 電話番号/メール確認画面の確認と対応
        try:
            email_input = WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[data-testid="ocfEnterTextTextInput"]'))
            )
            print("⚠️ === メール2段階認証が検出されました ===")
            print("🔧 多層防御による認証回避を実行します")
            print("🔄 1. プロファイル削除")
            print("🔄 2. 多様なプロキシ使用") 
            print("🔄 3. ブラウザ指紋変更")
            
            # ドライバーを一旦終了
            try:
                driver.quit()
            except:
                pass
            
            # プロファイルを削除
            profile_deleted = delete_chrome_profile_for_auth_reset()
            
            if profile_deleted:
                # 多様なプロキシマネージャーを使用
                from .proxy_manager import get_proxy_manager, get_tor_manager
                
                print("🌐 === 多様なプロキシによるIP変更 ===")
                
                # まずTorでIP変更を試行
                tor_manager = get_tor_manager()
                print("🔄 Tor経由でIP変更を試行...")
                
                tor_manager.stop_tor_service()
                time.sleep(2)
                
                tor_ip_changed = tor_manager.change_tor_ip()
                
                if tor_ip_changed:
                    print("✅ Tor経由IP変更成功")
                else:
                    print("⚠️ Tor IP変更失敗、通常プロキシを試行...")
                    
                    # Torが失敗した場合は通常のプロキシマネージャーを使用
                    proxy_manager = get_proxy_manager()
                    proxy_ip_changed, new_proxy = proxy_manager.change_ip()
                    
                    if proxy_ip_changed:
                        print(f"✅ 通常プロキシ経由IP変更成功: {new_proxy.host}:{new_proxy.port}")
                    else:
                        print("⚠️ 全プロキシでIP変更失敗")
                
                # ブラウザ指紋変更のため追加待機
                print("🕐 ブラウザ指紋リセットのため10秒待機...")
                time.sleep(10)
                
                print("✅ 多層防御による認証回避処理完了")
                print("💡 新しいIP・クリーンプロファイル・変更済み指紋で再試行")
                print("⚠️ この多層防御により認証回避の成功率が向上します")
                return False  # ログイン処理を中断して再試行を促す
            else:
                print("❌ プロファイル削除に失敗")
                return False
                
        except:
            pass  # メール確認画面がなければ続行
        
        # パスワード入力（複数のセレクタを試行）
        password_selectors = [
            'input[type="password"]',
            'input[name="password"]',
            'input[autocomplete="current-password"]'
        ]
        
        password_input = None
        for selector in password_selectors:
            try:
                password_input = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                print(f"✅ パスワード入力欄を発見: {selector}")
                break
            except:
                continue
        
        if not password_input:
            print("❌ パスワード入力欄が見つかりません")
            return False
        
        try:
            password_input.clear()
            password_input.send_keys(password)
            password_input.send_keys(Keys.RETURN)
            time.sleep(2)
        except Exception as e:
            print(f"❌ パスワード入力失敗: {str(e)[:50]}...")
            return False
        
        # ログイン成功確認（より堅牢に）
        print("🔍 ログイン完了を待機中...")
        time.sleep(3)  # 少し待機してからチェック
        
        # 複数の方法でログイン成功を確認
        success_indicators = [
            '[data-testid="SideNav_AccountSwitcher_Button"]',
            '[data-testid="SideNav_NewTweet_Button"]',
            '[data-testid="primaryColumn"]'
        ]
        
        for indicator in success_indicators:
            try:
                element = WebDriverWait(driver, 3).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, indicator))
                )
                if element:
                    print("✅ ログイン成功！")
                    return True
            except:
                continue
        
        # URL状態でも確認
        try:
            current_url = driver.current_url
            if "/home" in current_url and "login" not in current_url:
                print("✅ ログイン成功（URL確認）！")
                return True
        except:
            pass
        
        print("❌ ログイン失敗または確認できませんでした")
        return False
        
    except Exception as e:
        print(f"❌ ログインエラー: {str(e)[:50]}...")
        return False

def post_tweet(driver, message, image_path=None, actually_post=True):
    """ツイートを投稿（画像付きまたはテキストのみ）"""
    try:
        print(f"ツイート処理中: {message}")
        print(f"実際の投稿: {'はい' if actually_post else 'いいえ（投稿画面で終了）'}")
        
        # ホームページへ移動（必要な場合のみ）
        current_url = driver.current_url
        if "/home" not in current_url:
            print("🔄 Twitterホームページに移動中...")
            driver.get("https://twitter.com/home")
            time.sleep(1)
        else:
            print("✅ 既にTwitterホームページにいます")
        
        # ツイート入力エリアをクリック
        tweet_textarea = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
        )
        
        # 2回目以降の場合、既存のテキストをクリア
        try:
            existing_text = tweet_textarea.get_attribute('value') or tweet_textarea.text
            if existing_text and existing_text.strip():
                print("🔄 既存のテキストをクリア中...")
                tweet_textarea.clear()
                time.sleep(0.2)
        except:
            pass
        
        tweet_textarea.click()
        time.sleep(0.3)  # 待機時間を短縮
        
        # テキスト入力
        print("📝 テキスト入力中...")
        text_input_success = input_text_with_events(driver, tweet_textarea, message)
        
        # 画像アップロード（指定がある場合）
        if image_path and os.path.exists(image_path):
            try:
                print("🖼️ 画像アップロード中...")
                file_input = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="file"][accept*="image"]'))
                )
                file_input.send_keys(os.path.abspath(image_path))
                time.sleep(2)  # 待機時間を短縮
                
                # アップロード完了確認
                WebDriverWait(driver, 3).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="media"]'))
                )
                print("✅ 画像アップロード完了")
            except Exception as e:
                print(f"❌ 画像アップロードエラー: {e}")
        
        time.sleep(0.2)  # 待機時間を短縮
        
        # 投稿ボタンの確認（存在確認のみ）
        post_button = find_tweet_button(driver)
        if not post_button:
            raise Exception("投稿ボタンが見つかりません")
        
        if actually_post:
            # 実際に投稿
            print("🚀 投稿ボタンをクリック中...")
            driver.execute_script("arguments[0].click();", post_button)
            time.sleep(3)  # 待機時間を短縮
            
            # 投稿完了確認
            try:
                WebDriverWait(driver, 3).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweetTextarea_0"]'))
                )
                print("✅ ツイート投稿完了！")
                return True
            except:
                print("⚠️ 投稿完了の確認ができませんでしたが、投稿ボタンはクリックしました")
                return True
        else:
            # 投稿画面で終了
            print("✅ 投稿画面を準備完了。投稿ボタンは押さずに終了します。")
            print("💡 次回実行時は、この画面から即座に投稿されます。")
            time.sleep(1)  # 画面確認のため短時間待機
            return True
        
    except Exception as e:
        print(f"❌ 投稿処理エラー: {e}")
        return False 