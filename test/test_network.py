#!/usr/bin/env python3
"""
External network access test script for Docker container
直接外部サイトへのアクセスをテストし、結果を返す
"""

import requests
import json
import time
import sys

def test_external_access():
    """外部サイトへのアクセステスト"""
    print("🔍 === 外部ネットワークアクセステスト開始 ===")
    
    test_sites = [
        ("https://www.google.com", "Google"),
        ("https://httpbin.org/ip", "HTTPBin"),  
        ("https://twitter.com", "Twitter"),
        ("https://x.com", "X (Twitter)")
    ]
    
    successful_sites = 0
    twitter_access = False
    results = {}
    
    # SSL検証を無効にして最大互換性を確保
    session = requests.Session()
    session.verify = False
    
    for url, name in test_sites:
        try:
            print(f"📡 {name} アクセステスト中... ({url})")
            
            response = session.get(url, timeout=15, allow_redirects=True)
            
            if response.status_code < 400:
                print(f"✅ {name} アクセス成功: Status {response.status_code}, Size {len(response.content)}")
                successful_sites += 1
                results[name] = {
                    "status": "success",
                    "status_code": response.status_code,
                    "content_length": len(response.content)
                }
                if "twitter" in url.lower() or "x.com" in url.lower():
                    twitter_access = True
            else:
                print(f"⚠️ {name} レスポンスエラー: Status {response.status_code}")
                # 400番台でもネットワーク接続自体は成功とみなす
                if response.status_code < 500:
                    successful_sites += 1
                    if "twitter" in url.lower() or "x.com" in url.lower():
                        twitter_access = True
                results[name] = {
                    "status": "warning", 
                    "status_code": response.status_code,
                    "content_length": len(response.content)
                }
                
        except Exception as e:
            print(f"❌ {name} アクセス失敗: {str(e)}")
            results[name] = {"status": "failed", "error": str(e)}
    
    print(f"📊 結果: {successful_sites}/{len(test_sites)} サイト成功")
    print(f"🐦 Twitter アクセス: {'✅ 成功' if twitter_access else '❌ 制限あり'}")
    
    # 結果を JSON で返す
    final_result = {
        "total_sites": len(test_sites),
        "successful_sites": successful_sites, 
        "twitter_access": twitter_access,
        "network_available": successful_sites >= 2,
        "test_results": results
    }
    
    return final_result

if __name__ == "__main__":
    try:
        result = test_external_access()
        print("\n" + "="*50)
        print("📋 最終結果:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # 成功した場合は exit code 0, 失敗は 1
        sys.exit(0 if result["network_available"] else 1)
        
    except Exception as e:
        print(f"💥 テスト実行エラー: {e}")
        sys.exit(2)