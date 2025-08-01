#!/usr/bin/env python3
"""
Test Selenium in Docker-like environment (simulated for testing)
"""
import os
import sys
import time

# Set Docker-like environment variables
os.environ['DISPLAY'] = ':99'
os.environ['TWITTER_USERNAME'] = 'meiteko_stock'
os.environ['TWITTER_PASSWORD'] = '***REMOVED_DB_PASSWORD***'
os.environ['TWITTER_EMAIL'] = 'meiteko.stock@gmail.com'
os.environ['PYTHONUNBUFFERED'] = '1'

# Add the Python modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from python.twitter_auto_post.config import get_twitter_credentials, validate_credentials
from python.twitter_auto_post.browser_manager import create_chrome_driver, cleanup_specific_driver
from python.twitter_auto_post.twitter_actions import twitter_login

def test_docker_like_selenium():
    """Test Selenium with Docker-like configuration"""
    
    print("🐳 Testing Docker-like Selenium environment...")
    print(f"📋 Environment variables:")
    print(f"   DISPLAY: {os.environ.get('DISPLAY')}")
    print(f"   TWITTER_USERNAME: {os.environ.get('TWITTER_USERNAME')}")
    print(f"   PYTHONUNBUFFERED: {os.environ.get('PYTHONUNBUFFERED')}")
    
    # Validate credentials
    if not validate_credentials():
        print("❌ Credential validation failed")
        return False
    
    driver = None
    try:
        # Create Chrome driver with Docker-like settings
        print("📱 Creating Chrome driver with Docker-like configuration...")
        driver = create_chrome_driver()
        
        if not driver:
            print("❌ Failed to create Chrome driver")
            return False
        
        print("✅ Chrome driver created successfully")
        
        # Test basic navigation
        print("🌐 Testing basic navigation...")
        driver.get("https://httpbin.org/ip")
        time.sleep(2)
        
        print("📄 Current page title:", driver.title)
        
        # Get IP address for testing
        try:
            body_text = driver.find_element("tag name", "body").text
            print("🌍 IP information:", body_text[:100])
        except Exception as e:
            print(f"⚠️ Could not get IP info: {e}")
        
        # Login to Twitter
        print("🔑 Testing Twitter login...")
        username, password = get_twitter_credentials()
        login_success = twitter_login(driver, username, password)
        
        if login_success:
            print("✅ Twitter login test successful!")
            return True
        else:
            print("❌ Twitter login test failed")
            return False
            
    except Exception as e:
        print(f"❌ Error during Docker-like test: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if driver:
            print("🧹 Cleaning up...")
            try:
                cleanup_specific_driver(driver)
            except:
                pass

if __name__ == "__main__":
    print("🚀 Starting Docker-like Selenium test...")
    success = test_docker_like_selenium()
    
    if success:
        print("✅ Docker-like Selenium test completed successfully!")
        sys.exit(0)
    else:
        print("❌ Docker-like Selenium test failed!")
        sys.exit(1)