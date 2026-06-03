#!/usr/bin/env python3
import sys
import os
import time
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from twitter_auto_post.proxy_manager import get_tor_manager

def test_tor_ip_changes():
    tor_manager = get_tor_manager()
    
    print('🔍 === Tor IP変更状況確認 ===')
    
    # 現在のIP取得
    current_ip = tor_manager._get_ip_via_tor()
    print(f'🌐 現在のTor IP: {current_ip}')
    
    successful_changes = 0
    
    # 3回連続でIP変更をテスト
    for i in range(3):
        print(f'\n🔄 IP変更テスト {i+1}/3')
        
        old_ip = tor_manager._get_ip_via_tor()
        print(f'変更前IP: {old_ip}')
        
        # IP変更実行
        success = tor_manager.change_tor_ip()
        
        if success:
            new_ip = tor_manager._get_ip_via_tor()
            print(f'変更後IP: {new_ip}')
            if old_ip != new_ip and new_ip != "Unknown":
                print('✅ IP変更成功')
                successful_changes += 1
            else:
                print('⚠️ IPが変更されていない')
        else:
            print('❌ IP変更失敗')
        
        if i < 2:  # 最後以外は待機
            time.sleep(3)
    
    print(f'\n📊 === テスト結果 ===')
    print(f'成功回数: {successful_changes}/3')
    print(f'成功率: {(successful_changes/3)*100:.1f}%')
    
    if successful_changes >= 2:
        print('✅ Tor IP変更は正常に動作しています')
        return True
    else:
        print('⚠️ Tor IP変更に問題があります')
        return False

if __name__ == "__main__":
    test_tor_ip_changes()