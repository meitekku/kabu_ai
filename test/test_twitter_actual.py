#!/usr/bin/env python3
import sys
import time
sys.path.append('/app/python')

def test_twitter_login():
    print('🧪 === Twitter実際ログインテスト ===')
    
    # 投稿回数をリセット
    from twitter_auto_post.config import reset_post_count
    reset_post_count()
    print('📊 投稿回数をリセット完了')
    
    # メイン処理を実行
    from twitter_auto_post.main import main
    
    # テストメッセージ
    test_message = f'🧪 メール認証回避テスト {time.strftime("%H:%M:%S")}'
    
    print(f'📝 テストメッセージ: {test_message}')
    print('🚀 Twitter投稿処理開始...')
    
    # 実際に投稿処理を実行
    result = main(test_message)
    
    print(f'📊 処理結果: {"成功" if result else "失敗"}')
    
    if result:
        print('✅ メール認証回避テスト成功!')
        print('💡 投稿画面まで到達または実際に投稿完了')
    else:
        print('❌ メール認証回避テストで問題発生')
        print('💡 ログイン時にメール認証が発生した可能性')
    
    return result

if __name__ == "__main__":
    success = test_twitter_login()
    if success:
        print('\n🎯 === 2回目投稿テスト ===')
        time.sleep(5)
        
        # 2回目のテスト（実際に投稿されるはず）
        from twitter_auto_post.main import main
        test_message2 = f'⚡ 2回目投稿テスト {time.strftime("%H:%M:%S")}'
        
        result2 = main(test_message2)
        print(f'📊 2回目結果: {"成功" if result2 else "失敗"}')
        
        if result2:
            print('🏆 2回投稿テスト完全成功!')
        else:
            print('⚠️ 2回目投稿で問題発生')