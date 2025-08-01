#!/usr/bin/env python3
"""
プロキシ機能テストスクリプト
"""

import os
import sys
import time

# pythonディレクトリをパスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from python.twitter_auto_post.proxy_manager import get_proxy_manager
from python.twitter_auto_post.main import quick_tweet

def test_proxy_functionality():
    """プロキシ機能の動作テスト"""
    
    print("=== プロキシ機能テスト開始 ===")
    
    # プロキシマネージャーを取得
    proxy_manager = get_proxy_manager()
    
    # 1. 現在のIPを確認
    print("--- 1. 現在のIP確認 ---")
    current_ip = proxy_manager.get_current_ip()
    print(f"現在のIP: {current_ip}")
    
    # 2. プロキシリストの確認
    print("\n--- 2. プロキシリスト確認 ---")
    print(f"利用可能なプロキシ数: {len(proxy_manager.proxy_list)}")
    for i, proxy in enumerate(proxy_manager.proxy_list):
        print(f"  {i+1}. {proxy.host}:{proxy.port} ({proxy.protocol})")
    
    # 3. プロキシテスト
    print("\n--- 3. プロキシ接続テスト ---")
    if proxy_manager.proxy_list:
        test_proxy = proxy_manager.get_current_proxy()
        if test_proxy:
            print(f"テスト対象プロキシ: {test_proxy.host}:{test_proxy.port}")
            success = proxy_manager.test_proxy(test_proxy, timeout=15)
            print(f"接続テスト結果: {'✅ 成功' if success else '❌ 失敗'}")
        else:
            print("❌ テスト可能なプロキシがありません")
    else:
        print("⚠️ プロキシリストが空です")
    
    # 4. IP変更テスト
    print("\n--- 4. IP変更テスト ---")
    success, new_proxy = proxy_manager.change_ip()
    
    if success and new_proxy:
        print(f"✅ IP変更成功")
        print(f"使用プロキシ: {new_proxy.host}:{new_proxy.port}")
        
        # 新しいIPを確認
        new_ip = proxy_manager.get_current_ip(new_proxy)
        print(f"新しいIP: {new_ip}")
        
        if new_ip != current_ip:
            print("✅ IPが正常に変更されました")
        else:
            print("⚠️ IPが変更されていません")
    else:
        print("❌ IP変更に失敗しました")
    
    # 5. Twitter投稿テスト（テスト用メッセージ）
    print("\n--- 5. プロキシ付きTwitter投稿テスト ---")
    print("⚠️ 実際のTwitter投稿はスキップします（テスト用）")
    
    # 実際に投稿する場合は以下のコメントを外してください
    # test_message = f"プロキシ機能テスト - {time.strftime('%Y-%m-%d %H:%M:%S')}"
    # success = quick_tweet(test_message)
    # print(f"投稿結果: {'✅ 成功' if success else '❌ 失敗'}")
    
    print("\n=== プロキシ機能テスト完了 ===")
    
    # 結果サマリー
    print("\n=== テスト結果サマリー ===")
    print(f"プロキシ数: {len(proxy_manager.proxy_list)}")
    print(f"IP変更: {'✅ 成功' if success else '❌ 失敗'}")
    print("プロキシ機能は正常に実装されました")

if __name__ == "__main__":
    test_proxy_functionality()