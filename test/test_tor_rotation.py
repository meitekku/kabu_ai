#!/usr/bin/env python3
"""
Test Tor IP rotation functionality
"""
import requests
import time
from python.twitter_auto_post.proxy_manager import get_proxy_manager

def get_current_ip():
    """Get current IP via Tor"""
    try:
        proxies = {
            'http': 'socks5://127.0.0.1:9050',
            'https': 'socks5://127.0.0.1:9050'
        }
        response = requests.get('https://httpbin.org/ip', proxies=proxies, timeout=10)
        return response.json()['origin']
    except Exception as e:
        print(f"Error getting IP: {e}")
        return None

def test_tor_rotation():
    """Test Tor IP rotation"""
    
    print("🔍 Testing Tor IP rotation...")
    
    # Get initial IP
    initial_ip = get_current_ip()
    print(f"🌐 Initial Tor IP: {initial_ip}")
    
    if not initial_ip:
        print("❌ Failed to get initial IP")
        return False
    
    # Get proxy manager
    proxy_manager = get_proxy_manager()
    
    # Test IP change 3 times
    for i in range(3):
        print(f"\n🔄 Attempt {i+1}: Changing Tor IP...")
        
        # Change Tor IP
        success = proxy_manager.change_tor_ip()
        
        if success:
            print("✅ Tor circuit change requested successfully")
            
            # Wait a bit for the change to take effect
            time.sleep(5)
            
            # Get new IP
            new_ip = get_current_ip()
            print(f"🌐 New Tor IP: {new_ip}")
            
            if new_ip != initial_ip and new_ip:
                print(f"✅ IP changed successfully: {initial_ip} → {new_ip}")
                initial_ip = new_ip  # Update for next iteration
            else:
                print(f"⚠️ IP did not change or failed to retrieve: {initial_ip} → {new_ip}")
        else:
            print("❌ Failed to change Tor circuit")
    
    print("\n🏁 Tor rotation test completed")
    return True

if __name__ == "__main__":
    test_tor_rotation()