#!/usr/bin/env python3
import sys
import time
sys.path.append('/app/python')

from twitter_auto_post.proxy_manager import get_tor_manager

def test_tor_detailed():
    tor_manager = get_tor_manager()
    
    print('🔍 === Tor詳細テスト ===')
    
    # 現在のIP取得
    print('📡 現在のIP取得中...')
    current_ip = tor_manager._get_ip_via_tor()
    print(f'🌐 現在のTor IP: {current_ip}')
    
    if current_ip == "Unknown":
        print('❌ Tor経由でのIP取得に失敗')
        return False
    
    # 回路変更テスト
    print('🔄 Tor回路変更テスト...')
    circuit_changed = tor_manager._request_new_tor_circuit()
    print(f'📊 回路変更結果: {circuit_changed}')
    
    if circuit_changed:
        print('⏳ 5秒待機中...')
        time.sleep(5)
        
        print('📡 変更後のIP取得中...')
        new_ip = tor_manager._get_ip_via_tor()
        print(f'🌐 変更後のTor IP: {new_ip}')
        
        if new_ip != "Unknown" and current_ip != new_ip:
            print('✅ Tor IP変更成功!')
            return True
        else:
            print('⚠️ IP変更が確認できない')
            return False
    else:
        print('❌ Tor回路変更に失敗')
        return False

if __name__ == "__main__":
    success = test_tor_detailed()
    print(f'🏁 テスト結果: {"成功" if success else "失敗"}')