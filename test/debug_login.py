#!/usr/bin/env python3
"""
Debug script to analyze the Twitter login page and find the password input field
"""

import sys
import os
import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def create_debug_driver():
    """Create a Chrome driver for debugging"""
    options = Options()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-setuid-sandbox')
    options.add_argument('--disable-gpu')
    options.add_argument('--headless=new')
    options.add_argument('--window-size=1280,800')
    
    # Chrome実行パスを設定
    chrome_paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ]
    
    for path in chrome_paths:
        if os.path.exists(path):
            options.binary_location = path
            break
    
    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        print(f"Failed to create driver: {e}")
        return None

def analyze_login_page(driver):
    """Analyze the current login page structure"""
    print("=== ANALYZING LOGIN PAGE ===")
    
    try:
        # Navigate to login page
        print("Navigating to login page...")
        driver.get('https://x.com/i/flow/login')
        time.sleep(5)
        
        print(f"Current URL: {driver.current_url}")
        print(f"Page title: {driver.title}")
        
        # Get all input elements
        inputs = driver.find_elements(By.TAG_NAME, 'input')
        print(f"\nFound {len(inputs)} input elements:")
        
        for i, inp in enumerate(inputs):
            try:
                attrs = {}
                for attr in ['type', 'name', 'id', 'class', 'placeholder', 'aria-label', 'data-testid', 'autocomplete', 'value']:
                    val = inp.get_attribute(attr)
                    if val:
                        attrs[attr] = val
                
                print(f"\nInput {i+1}:")
                print(f"  Visible: {inp.is_displayed()}")
                print(f"  Enabled: {inp.is_enabled()}")
                print(f"  Location: {inp.location}")
                print(f"  Size: {inp.size}")
                for attr, val in attrs.items():
                    print(f"  {attr}: {val}")
                    
            except Exception as e:
                print(f"  Error getting attributes: {e}")
        
        # Check for buttons that might advance the login flow
        buttons = driver.find_elements(By.TAG_NAME, 'button')
        print(f"\nFound {len(buttons)} button elements:")
        
        for i, btn in enumerate(buttons):
            try:
                text = btn.text or btn.get_attribute('aria-label') or btn.get_attribute('data-testid') or ''
                if text and ('next' in text.lower() or 'continue' in text.lower() or '次へ' in text.lower()):
                    print(f"\nRelevant Button {i+1}:")
                    print(f"  Text: {text}")
                    print(f"  Visible: {btn.is_displayed()}")
                    print(f"  Enabled: {btn.is_enabled()}")
                    print(f"  data-testid: {btn.get_attribute('data-testid')}")
            except:
                pass
        
        # Check page source for specific patterns
        page_source = driver.page_source
        
        # Look for password-related patterns
        password_patterns = [
            'type="password"',
            'name="password"',
            'autocomplete="current-password"',
            'data-testid="password"',
            'パスワード',
            'Password',
            'current-password'
        ]
        
        print(f"\nPage source analysis (length: {len(page_source)}):")
        for pattern in password_patterns:
            count = page_source.lower().count(pattern.lower())
            if count > 0:
                print(f"  '{pattern}': Found {count} times")
        
        # Try to simulate username input to see if it advances to password page
        print("\n=== SIMULATING USERNAME INPUT ===")
        
        # Find username input
        username_selectors = [
            'input[autocomplete="username"]',
            'input[name="text"]',
            'input[type="text"]'
        ]
        
        username_input = None
        for selector in username_selectors:
            try:
                username_input = driver.find_element(By.CSS_SELECTOR, selector)
                if username_input.is_displayed():
                    print(f"Found username input with selector: {selector}")
                    break
            except:
                continue
        
        if username_input:
            try:
                # Clear and input username
                username_input.clear()
                username_input.send_keys("meiteko_stock")
                time.sleep(1)
                
                # Look for Next button
                next_selectors = [
                    '[data-testid="LoginForm_Login_Button"]',
                    'button[role="button"]',
                    'div[role="button"]'
                ]
                
                next_button = None
                for selector in next_selectors:
                    try:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        for elem in elements:
                            text = elem.text or elem.get_attribute('aria-label') or ''
                            if 'next' in text.lower() or '次へ' in text.lower() or 'login' in text.lower():
                                next_button = elem
                                print(f"Found next button: {text}")
                                break
                        if next_button:
                            break
                    except:
                        continue
                
                if next_button:
                    # Click next button
                    driver.execute_script("arguments[0].click();", next_button)
                    print("Clicked next button")
                    time.sleep(5)  # Wait for page transition
                    
                    print(f"After next click - URL: {driver.current_url}")
                    
                    # Re-analyze the page for password inputs
                    print("\n=== RE-ANALYZING FOR PASSWORD INPUTS ===")
                    
                    inputs_after = driver.find_elements(By.TAG_NAME, 'input')
                    print(f"Found {len(inputs_after)} input elements after username submission:")
                    
                    for i, inp in enumerate(inputs_after):
                        try:
                            attrs = {}
                            for attr in ['type', 'name', 'id', 'class', 'placeholder', 'aria-label', 'data-testid', 'autocomplete']:
                                val = inp.get_attribute(attr)
                                if val:
                                    attrs[attr] = val
                            
                            # Check if this looks like a password field
                            is_password = False
                            password_indicators = ['password', 'パスワード', 'current-password']
                            for indicator in password_indicators:
                                for attr_val in attrs.values():
                                    if attr_val and indicator.lower() in attr_val.lower():
                                        is_password = True
                                        break
                                if is_password:
                                    break
                            
                            if is_password or attrs.get('type') == 'password':
                                print(f"\n*** POTENTIAL PASSWORD INPUT {i+1} ***")
                            else:
                                print(f"\nInput {i+1}:")
                            
                            print(f"  Visible: {inp.is_displayed()}")
                            print(f"  Enabled: {inp.is_enabled()}")
                            for attr, val in attrs.items():
                                print(f"  {attr}: {val}")
                                
                        except Exception as e:
                            print(f"  Error analyzing input {i+1}: {e}")
                    
                    # Check page source again
                    page_source_after = driver.page_source
                    print(f"\nPage source analysis after username (length: {len(page_source_after)}):")
                    for pattern in password_patterns:
                        count = page_source_after.lower().count(pattern.lower())
                        if count > 0:
                            print(f"  '{pattern}': Found {count} times")
                    
                    # Save page source for manual inspection
                    with open('/tmp/login_page_debug.html', 'w', encoding='utf-8') as f:
                        f.write(page_source_after)
                    print("\nPage source saved to /tmp/login_page_debug.html")
                    
                else:
                    print("Could not find next button")
            except Exception as e:
                print(f"Error during username input simulation: {e}")
        else:
            print("Could not find username input field")
    
    except Exception as e:
        print(f"Error analyzing login page: {e}")

def main():
    driver = create_debug_driver()
    if not driver:
        print("Failed to create debug driver")
        return
    
    try:
        analyze_login_page(driver)
        
        # Keep driver alive for a bit in case we want to inspect manually
        print("\nKeeping driver alive for 10 seconds for manual inspection...")
        time.sleep(10)
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()