#!/usr/bin/env python3
"""
Playwrightフォールバックテスト
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from playwright_twitter import playwright_twitter_test

def test_fallback():
    """フォールバックのテスト"""
    print("=" * 60)
    print("🔧 Playwrightフォールバックテスト")
    print("=" * 60)
    
    # テストメッセージ
    message = "Seleniumフォールバックテスト🚀"
    
    # テスト実行
    success = playwright_twitter_test(
        message=message,
        image_paths=[],
        test_mode=True,
        mobile_mode=True,
        device_type='iPhone14Pro'
    )
    
    print(f"\n最終結果: {'✅ 成功' if success else '❌ 失敗'}")
    return success

if __name__ == "__main__":
    test_fallback()