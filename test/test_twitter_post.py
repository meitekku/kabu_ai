#!/usr/bin/env python3
"""
Simple Twitter posting test
"""
import os
import sys
import time
from python.twitter_auto_post.config import get_twitter_credentials, validate_credentials
from python.twitter_auto_post.browser_manager import create_chrome_driver, cleanup_specific_driver
from python.twitter_auto_post.twitter_actions import twitter_login, post_tweet

def test_twitter_post():
    """Test actual Twitter posting"""
    
    # Set environment variables
    os.environ['TWITTER_USERNAME'] = 'meiteko_stock'
    os.environ['TWITTER_PASSWORD'] = '***REMOVED_DB_PASSWORD***'
    os.environ['TWITTER_EMAIL'] = 'meiteko.stock@gmail.com'
    
    print("🚀 Testing Twitter posting...")
    
    # Validate credentials
    if not validate_credentials():
        print("❌ Credential validation failed")
        return False
    
    driver = None
    try:
        # Create Chrome driver
        print("📱 Creating Chrome driver...")
        driver = create_chrome_driver()
        if not driver:
            print("❌ Failed to create Chrome driver")
            return False
        
        print("✅ Chrome driver created successfully")
        
        # Login to Twitter
        print("🔑 Logging into Twitter...")
        username, password = get_twitter_credentials()
        login_success = twitter_login(driver, username, password)
        
        if not login_success:
            print("❌ Twitter login failed")
            return False
        
        print("✅ Twitter login successful")
        
        # Post tweet
        test_message = "【テスト投稿】自動投稿システムのテスト実行中 🔧 #テスト #自動化"
        print(f"📝 Posting test message: {test_message}")
        
        success = post_tweet(driver, test_message)
        
        if success:
            print("✅ Tweet posted successfully!")
            return True
        else:
            print("❌ Tweet posting failed")
            return False
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False
        
    finally:
        if driver:
            print("🧹 Cleaning up...")
            cleanup_specific_driver(driver)

if __name__ == "__main__":
    success = test_twitter_post()
    sys.exit(0 if success else 1)