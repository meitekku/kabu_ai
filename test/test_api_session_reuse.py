#!/usr/bin/env python3
"""API経由でのセッション再利用テスト"""

import requests
import time
import json

def test_api_session_posting():
    """API経由でのセッション再利用投稿テスト"""
    print("=== API経由セッション再利用テスト開始 ===")
    
    api_url = "http://localhost:5000/post"
    headers = {"Content-Type": "application/json"}
    
    # 1回目投稿
    print("\n--- 1回目投稿 ---")
    payload1 = {
        "text": f"1回目投稿: API経由セッション管理テスト {time.strftime('%H:%M:%S')}",
        "image_path": ""
    }
    
    try:
        response1 = requests.post(api_url, headers=headers, json=payload1, timeout=120)
        print(f"1回目レスポンス: {response1.status_code}")
        print(f"1回目内容: {response1.text}")
        
        if response1.status_code == 200:
            result1 = response1.json()
            if result1.get("success"):
                print("✅ 1回目投稿成功")
            else:
                print("❌ 1回目投稿失敗")
                return False
        else:
            print("❌ 1回目投稿API呼び出し失敗")
            return False
            
    except Exception as e:
        print(f"1回目投稿エラー: {e}")
        return False
    
    # 少し待機
    print("\n--- 待機中 (10秒) ---")
    time.sleep(10)
    
    # 2回目投稿（セッション再利用期待）
    print("\n--- 2回目投稿 ---")
    payload2 = {
        "text": f"2回目投稿: セッション再利用による投稿 {time.strftime('%H:%M:%S')}",
        "image_path": ""
    }
    
    try:
        response2 = requests.post(api_url, headers=headers, json=payload2, timeout=120)
        print(f"2回目レスポンス: {response2.status_code}")
        print(f"2回目内容: {response2.text}")
        
        if response2.status_code == 200:
            result2 = response2.json()
            if result2.get("success"):
                print("✅ 2回目投稿成功")
                print("🎉 API経由でのセッション再利用による連続投稿が成功しました！")
                return True
            else:
                print("❌ 2回目投稿失敗")
                return False
        else:
            print("❌ 2回目投稿API呼び出し失敗")
            return False
            
    except Exception as e:
        print(f"2回目投稿エラー: {e}")
        return False

if __name__ == "__main__":
    result = test_api_session_posting()
    print(f"\n📊 最終結果: {'成功' if result else '失敗'}")
    if result:
        print("🎉 API経由でのセッション管理と連続投稿が成功しました！")
    else:
        print("❌ API経由でのセッション管理または投稿に失敗しました")