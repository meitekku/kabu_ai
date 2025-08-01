#!/usr/bin/env python3
"""
Investigate current Twitter login page structure
"""
import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def create_debug_driver():
    """Create Chrome driver for debugging"""
    options = ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Show browser for debugging (remove headless)
    # options.add_argument('--headless')
    
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver

def investigate_twitter_login():
    """Investigate Twitter login page structure"""
    
    driver = None
    try:
        print("🔍 Creating Chrome driver for investigation...")
        driver = create_debug_driver()
        
        print("📱 Navigating to Twitter login page...")
        driver.get("https://twitter.com/login")
        
        # Wait for page to load
        print("⏳ Waiting for page to load...")
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        
        time.sleep(5)  # Additional wait for dynamic content
        
        print("🔍 Analyzing page structure...")
        
        # Get all input elements
        inputs = driver.find_elements(By.TAG_NAME, "input")
        print(f"\n📋 Found {len(inputs)} input elements:")
        
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
        
        # Look for potential username fields
        print("\n🔍 Looking for potential username input fields...")
        
        # Try common selectors
        username_selectors = [
            'input[autocomplete="username"]',
            'input[name="text"]',
            'input[type="text"]',
            'input[data-testid*="username"]',
            'input[data-testid*="login"]',
            'input[data-testid*="user"]',
            'input[placeholder*="username"]',
            'input[placeholder*="ユーザー"]',
            'input[placeholder*="phone"]',
            'input[placeholder*="email"]',
            'input[aria-label*="username"]',
            'input[aria-label*="ユーザー"]',
            'input[aria-label*="phone"]',
            'input[aria-label*="email"]'
        ]
        
        for selector in username_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"✅ Found with selector '{selector}': {len(elements)} elements")
                    for j, elem in enumerate(elements):
                        if elem.is_displayed():
                            print(f"   Element {j+1} is visible and may be the username field")
            except Exception as e:
                print(f"❌ Error with selector '{selector}': {e}")
        
        # Get page source for manual inspection
        print("\n📄 Getting page source...")
        page_source = driver.page_source
        
        # Look for login form
        if 'login' in page_source.lower():
            print("✅ Page contains login-related content")
        
        # Look for input patterns in source
        import re
        input_patterns = re.findall(r'<input[^>]*>', page_source)
        print(f"\n🔍 Found {len(input_patterns)} input tags in source:")
        
        for i, pattern in enumerate(input_patterns[:10]):  # Show first 10
            print(f"  {i+1}: {pattern}")
        
        # Wait for user inspection
        print(f"\n⏸️  Browser window opened for manual inspection.")
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
    investigate_twitter_login()