#!/usr/bin/env python3
"""
Twitterログイン状況確認とテスト投稿スクリプト
"""

import time
import sys
import os
sys.path.append('/Users/takahashimika/Dropbox/web_kabu_ai/python')

def test_login_and_post():
    """ログイン状況を確認し、テスト投稿を実行"""
    from python.twitter_auto_post.main import main
    
    print("=== Twitter投稿テスト開始 ===")
    
    # 1回目のテスト投稿（投稿画面で終了）
    print("\n--- 1回目のテスト投稿 ---")
    start_time = time.time()
    
    result1 = main("1回目テスト: 処理時間測定機能検証 🚀")
    
    end_time = time.time()
    elapsed_time1 = end_time - start_time
    
    print(f"1回目結果: {result1}")
    print(f"1回目処理時間: {elapsed_time1:.2f}秒")
    
    if not result1:
        print("❌ 1回目投稿に失敗しました")
        return
    
    # 少し待機
    print("\n5秒待機中...")
    time.sleep(5)
    
    # 2回目のテスト投稿（実際に投稿）
    print("\n--- 2回目のテスト投稿 ---")
    start_time = time.time()
    
    result2 = main("2回目テスト: 高速化処理検証 ⚡")
    
    end_time = time.time()
    elapsed_time2 = end_time - start_time
    
    print(f"2回目結果: {result2}")
    print(f"2回目処理時間: {elapsed_time2:.2f}秒")
    
    # 結果比較
    print("\n=== 結果比較 ===")
    print(f"1回目処理時間: {elapsed_time1:.2f}秒")
    print(f"2回目処理時間: {elapsed_time2:.2f}秒")
    
    if elapsed_time1 > 0 and elapsed_time2 > 0:
        improvement = ((elapsed_time1 - elapsed_time2) / elapsed_time1) * 100
        print(f"処理時間改善: {improvement:.1f}%")
        
        if improvement > 0:
            print("✅ 2回目が高速化されました！")
        else:
            print("⚠️ 2回目の高速化効果が見られませんでした")
    
    print("=== テスト完了 ===")

if __name__ == "__main__":
    test_login_and_post()