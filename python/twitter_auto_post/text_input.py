import os
import time
from selenium.webdriver.common.keys import Keys

def input_text_with_clipboard(driver, element, text):
    """コピペ動作でテキストを確実に入力する"""
    try:
        print(f"クリップボード経由でテキスト入力: {text[:50]}...")
        
        element.click()
        time.sleep(0.2)
        
        # 既存のテキストをクリア
        try:
            if os.name == 'nt':  # Windows
                element.send_keys(Keys.CONTROL, 'a')
            else:  # Mac/Linux
                element.send_keys(Keys.COMMAND, 'a')
            time.sleep(0.1)
            element.send_keys(Keys.DELETE)
            time.sleep(0.1)
        except:
            pass
        
        # 方法1: document.execCommand
        try:
            script = """
            var tempTextArea = document.createElement('textarea');
            tempTextArea.value = arguments[0];
            tempTextArea.style.position = 'fixed';
            tempTextArea.style.left = '-9999px';
            tempTextArea.style.top = '-9999px';
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            tempTextArea.setSelectionRange(0, 99999);
            var copySuccess = false;
            try {
                copySuccess = document.execCommand('copy');
            } catch (err) {}
            document.body.removeChild(tempTextArea);
            return copySuccess;
            """
            
            if driver.execute_script(script, text):
                element.click()
                time.sleep(0.1)
                
                if os.name == 'nt':
                    element.send_keys(Keys.CONTROL, 'v')
                else:
                    element.send_keys(Keys.COMMAND, 'v')
                
                time.sleep(0.3)
                
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ execCommand方式でテキスト入力成功")
                    return True
                    
        except Exception as e:
            print(f"execCommand方式エラー: {e}")
        
        # 方法2: navigator.clipboard API
        try:
            script = """
            return navigator.clipboard.writeText(arguments[0]).then(function() {
                return true;
            }).catch(function(err) {
                return false;
            });
            """
            
            if driver.execute_script(script, text):
                element.click()
                time.sleep(0.1)
                
                if os.name == 'nt':
                    element.send_keys(Keys.CONTROL, 'v')
                else:
                    element.send_keys(Keys.COMMAND, 'v')
                
                time.sleep(0.3)
                
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ navigator.clipboard方式でテキスト入力成功")
                    return True
                    
        except Exception as e:
            print(f"navigator.clipboard方式エラー: {e}")
        
        # 方法3: DOM操作
        try:
            script = """
            var element = arguments[0];
            var text = arguments[1];
            
            element.focus();
            
            var pasteEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            pasteEvent.clipboardData.setData('text/plain', text);
            element.dispatchEvent(pasteEvent);
            
            if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                element.value = text;
            } else {
                element.textContent = text;
                element.innerHTML = text.replace(/\\n/g, '<br>');
            }
            
            ['input', 'change', 'keyup'].forEach(function(eventType) {
                var event = new Event(eventType, { bubbles: true, cancelable: true });
                element.dispatchEvent(event);
            });
            
            return element.textContent || element.value || '';
            """
            
            result = driver.execute_script(script, element, text)
            time.sleep(0.3)
            
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ DOM操作方式でテキスト入力成功")
                return True
                
        except Exception as e:
            print(f"DOM操作方式エラー: {e}")
        
        # 方法4: pyperclip（システムクリップボード）
        try:
            import pyperclip
            pyperclip.copy(text)
            
            element.click()
            time.sleep(0.2)
            
            if os.name == 'nt':
                element.send_keys(Keys.CONTROL, 'v')
            else:
                element.send_keys(Keys.COMMAND, 'v')
            
            time.sleep(0.3)
            
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ pyperclip方式でテキスト入力成功")
                return True
                
        except ImportError:
            print("pyperclip がインストールされていません (pip install pyperclip)")
        except Exception as e:
            print(f"pyperclip方式エラー: {e}")
        
        print("❌ すべてのクリップボード方式が失敗しました")
        return False
        
    except Exception as e:
        print(f"❌ クリップボード入力で予期しないエラー: {e}")
        return False

def input_text_with_first_char_typing(driver, element, text):
    """1文字目はタイピング、2文字目以降はペースト方式でテキスト入力"""
    try:
        print(f"テキスト入力開始（1文字目タイピング+残りペースト方式）: {text[:50]}...")
        
        if not text:
            return True
        
        element.click()
        time.sleep(0.1)  # 短縮された待機時間
        
        # 既存のテキストをクリア
        try:
            if os.name == 'nt':  # Windows
                element.send_keys(Keys.CONTROL, 'a')
            else:  # Mac/Linux
                element.send_keys(Keys.COMMAND, 'a')
            time.sleep(0.05)
            element.send_keys(Keys.DELETE)
            time.sleep(0.05)
        except:
            pass
        
        # 1文字目を通常のタイピングで入力
        first_char = text[0]
        print(f"📝 1文字目をタイピング: '{first_char}'")
        element.send_keys(first_char)
        time.sleep(0.1)  # 短縮された待機時間
        
        # 2文字目以降がある場合は、ペースト方式で一気に入力
        if len(text) > 1:
            remaining_text = text[1:]
            print(f"📋 2文字目以降をペースト: '{remaining_text[:30]}{'...' if len(remaining_text) > 30 else ''}'")
            
            # 方法1: document.execCommand（最も確実）
            try:
                script = """
                var tempTextArea = document.createElement('textarea');
                tempTextArea.value = arguments[0];
                tempTextArea.style.position = 'fixed';
                tempTextArea.style.left = '-9999px';
                tempTextArea.style.top = '-9999px';
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                tempTextArea.setSelectionRange(0, 99999);
                var copySuccess = false;
                try {
                    copySuccess = document.execCommand('copy');
                } catch (err) {}
                document.body.removeChild(tempTextArea);
                return copySuccess;
                """
                
                if driver.execute_script(script, remaining_text):
                    time.sleep(0.05)
                    
                    if os.name == 'nt':
                        element.send_keys(Keys.CONTROL, 'v')
                    else:
                        element.send_keys(Keys.COMMAND, 'v')
                    
                    time.sleep(0.2)  # 短縮された待機時間
                    
                    current_text = element.text or element.get_attribute('value') or ''
                    if text.strip() in current_text.strip():
                        print("✅ 1文字目タイピング+ペースト方式で成功")
                        return True
                        
            except Exception as e:
                print(f"ペースト方式エラー: {e}")
            
            # 方法2: pyperclip（システムクリップボード）
            try:
                import pyperclip
                pyperclip.copy(remaining_text)
                time.sleep(0.05)
                
                if os.name == 'nt':
                    element.send_keys(Keys.CONTROL, 'v')
                else:
                    element.send_keys(Keys.COMMAND, 'v')
                
                time.sleep(0.2)
                
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ 1文字目タイピング+pyperclipペースト方式で成功")
                    return True
                    
            except ImportError:
                print("pyperclip がインストールされていません")
            except Exception as e:
                print(f"pyperclipペースト方式エラー: {e}")
            
            # 方法3: フォールバック（残りの文字も1文字ずつ高速入力）
            try:
                print("ペースト失敗、残りの文字を高速タイピングで入力...")
                for char in remaining_text:
                    element.send_keys(char)
                    time.sleep(0.02)  # 非常に短い待機時間
                
                time.sleep(0.1)
                
                current_text = element.text or element.get_attribute('value') or ''
                if text.strip() in current_text.strip():
                    print("✅ 1文字目タイピング+高速タイピング方式で成功")
                    return True
                    
            except Exception as e:
                print(f"高速タイピング方式エラー: {e}")
        
        # 最終確認
        current_text = element.text or element.get_attribute('value') or ''
        if text.strip() in current_text.strip():
            print("✅ テキスト入力成功")
            return True
        
        print("❌ 1文字目タイピング+ペースト方式が失敗しました")
        return False
        
    except Exception as e:
        print(f"❌ 1文字目タイピング+ペースト方式で予期しないエラー: {e}")
        return False

def input_text_with_events(driver, element, text):
    """テキストを確実に入力する（1文字目タイピング+ペースト方式優先）"""
    try:
        print(f"テキスト入力開始: {text[:50]}...")
        
        # 新しい方式を最初に試行
        if input_text_with_first_char_typing(driver, element, text):
            return True
        
        print("1文字目タイピング+ペースト方式が失敗、従来のクリップボード方式を試行...")
        
        if input_text_with_clipboard(driver, element, text):
            return True
        
        print("クリップボード方式が失敗、フォールバック方式を試行...")
        
        # フォールバック1: JavaScript直接設定
        try:
            script = """
            var element = arguments[0];
            var text = arguments[1];
            
            element.focus();
            element.click();
            
            if (element.tagName.toLowerCase() === 'textarea' || 
                (element.tagName.toLowerCase() === 'input' && element.type === 'text')) {
                element.value = text;
            } else {
                element.textContent = text;
                element.innerHTML = text.replace(/\\n/g, '<br>');
            }
            
            ['input', 'change', 'blur', 'focus'].forEach(function(eventType) {
                var event = new Event(eventType, { 
                    bubbles: true, 
                    cancelable: true 
                });
                element.dispatchEvent(event);
            });
            
            return element.textContent || element.value || '';
            """
            
            result = driver.execute_script(script, element, text)
            time.sleep(0.2)  # 短縮された待機時間
            
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ JavaScript直接設定で成功")
                return True
                
        except Exception as e:
            print(f"JavaScript直接設定エラー: {e}")
        
        # フォールバック2: ゆっくり文字入力
        try:
            element.clear()
            element.click()
            time.sleep(0.1)  # 短縮された待機時間
            
            chunk_size = 10
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                element.send_keys(chunk)
                time.sleep(0.03)  # 短縮された待機時間
            
            time.sleep(0.2)  # 短縮された待機時間
            
            current_text = element.text or element.get_attribute('value') or ''
            if text.strip() in current_text.strip():
                print("✅ ゆっくり文字入力で成功")
                return True
                
        except Exception as e:
            print(f"ゆっくり文字入力エラー: {e}")
        
        print("❌ すべての入力方式が失敗しました")
        return False
        
    except Exception as e:
        print(f"❌ テキスト入力で予期しないエラー: {e}")
        return False 