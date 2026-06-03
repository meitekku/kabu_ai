#!/usr/bin/env python3
"""
Investigate Twitter password page structure after username input
"""
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

def create_debug_driver():
    """Create Chrome driver for debugging"""
    options = ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Show browser for debugging
    # options.add_argument('--headless')
    
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver

def investigate_password_page():
    """Investigate Twitter password page after username input"""
    
    driver = None
    try:
        print("🔍 Creating Chrome driver for password page investigation...")
        driver = create_debug_driver()
        
        print("📱 Navigating to Twitter login page...")
        driver.get("https://x.com/i/flow/login")
        
        # Wait for page to load
        print("⏳ Waiting for page to load...")
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        
        time.sleep(3)
        
        print("🔍 Looking for username input...")
        
        # Find username input
        username_input = None
        try:
            username_input = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
            )
            print("✅ Found username input")
        except:
            try:
                username_input = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, 'input[name="text"]'))
                )
                print("✅ Found username input via name='text'")
            except:
                print("❌ Could not find username input")
                return False
        
        if username_input:
            print("📝 Entering username...")
            username_input.clear()
            username_input.send_keys("meiteko_stock")
            username_input.send_keys(Keys.RETURN)
            
            print("⏳ Waiting for password page to load...")
            time.sleep(5)
            
            print(f"📄 Current URL after username: {driver.current_url}")
            
            # Get all input elements on password page
            inputs = driver.find_elements(By.TAG_NAME, "input")
            print(f"\n📋 Found {len(inputs)} input elements on password page:")
            
            for i, input_elem in enumerate(inputs):
                try:
                    attrs = {
                        'type': input_elem.get_attribute('type'),
                        'name': input_elem.get_attribute('name'),
                        'id': input_elem.get_attribute('id'),
                        'class': input_elem.get_attribute('class'),
                        'placeholder': input_elem.get_attribute('placeholder'),
                        'autocomplete': input_elem.get_attribute('autocomplete'),
                        'data-testid': input_elem.get_attribute('data-testid'),
                        'aria-label': input_elem.get_attribute('aria-label'),
                        'visible': input_elem.is_displayed(),
                        'enabled': input_elem.is_enabled()
                    }
                    print(f"  Input {i+1}: {attrs}")
                except Exception as e:
                    print(f"  Input {i+1}: Error getting attributes - {e}")
            
            # Look for any buttons or other interactive elements
            buttons = driver.find_elements(By.TAG_NAME, "button")
            print(f"\n📋 Found {len(buttons)} button elements:")
            
            for i, button in enumerate(buttons[:5]):  # Show first 5 buttons
                try:
                    attrs = {
                        'type': button.get_attribute('type'),
                        'class': button.get_attribute('class'),
                        'data-testid': button.get_attribute('data-testid'),
                        'text': button.text,
                        'visible': button.is_displayed(),
                        'enabled': button.is_enabled()
                    }
                    print(f"  Button {i+1}: {attrs}")
                except Exception as e:
                    print(f"  Button {i+1}: Error getting attributes - {e}")
            
            # Check for any error messages or special divs
            divs = driver.find_elements(By.TAG_NAME, "div")
            visible_text_divs = []
            for div in divs:
                try:
                    text = div.text.strip()
                    if text and len(text) < 100 and div.is_displayed():
                        visible_text_divs.append(text)
                except:
                    pass
            
            print(f"\n📋 Some visible text content:")
            for i, text in enumerate(visible_text_divs[:10]):  # Show first 10
                print(f"  Text {i+1}: {text}")
            
            # Wait for manual inspection
            print(f"\n⏸️  Browser window opened for manual password page inspection.")
            print("   Check the page elements manually and press Enter to continue...")
            input("   Press Enter when ready to close...")
        
        return True
        
    except Exception as e:
        print(f"❌ Investigation failed: {e}")
        return False
        
    finally:
        if driver:
            print("🧹 Closing browser...")
            driver.quit()

if __name__ == "__main__":
    investigate_password_page()