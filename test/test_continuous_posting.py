#!/usr/bin/env python3
import sys
import time
sys.path.append('/app/python')

def test_continuous_posting():
    print('🎯 === 連続投稿テスト（ブラウザ保持） ===')
    
    # 投稿回数をリセット
    from twitter_auto_post.config import reset_post_count, get_post_count
    reset_post_count()
    print('📊 投稿回数をリセット完了')
    
    from twitter_auto_post.main import main
    
    # === 1回目投稿（ログイン + 投稿画面準備） ===
    print('\n🚀 === 1回目投稿テスト ===')
    current_count = get_post_count()
    print(f'📊 現在の投稿回数: {current_count}')
    
    start_time1 = time.time()
    test_message1 = f'🎯 1回目テスト {time.strftime("%H:%M:%S")}'
    
    print(f'📝 1回目メッセージ: {test_message1}')
    print('🔄 ログイン + 投稿画面準備を実行...')
    
    # keep_browser=True でブラウザを保持
    result1 = main(test_message1, keep_browser=True)
    
    elapsed_time1 = time.time() - start_time1
    print(f'📊 1回目結果: {"成功" if result1 else "失敗"}')
    print(f'📊 1回目処理時間: {elapsed_time1:.2f}秒')
    
    if not result1:
        print('❌ 1回目投稿で失敗しました')
        return False
    
    # 少し待機
    print('\n⏳ 5秒待機中...')
    time.sleep(5)
    
    # === 2回目投稿（既存ブラウザで実際投稿） ===
    print('\n⚡ === 2回目投稿テスト（高速化・実際投稿） ===')
    current_count2 = get_post_count()
    print(f'📊 現在の投稿回数: {current_count2}')
    
    start_time2 = time.time()
    test_message2 = f'⚡ 2回目テスト {time.strftime("%H:%M:%S")}'
    
    print(f'📝 2回目メッセージ: {test_message2}')
    print('🚀 既存ブラウザで実際投稿を実行...')
    
    # 2回目も keep_browser=True でブラウザを保持
    result2 = main(test_message2, keep_browser=True)
    
    elapsed_time2 = time.time() - start_time2
    print(f'📊 2回目結果: {"成功" if result2 else "失敗"}')
    print(f'📊 2回目処理時間: {elapsed_time2:.2f}秒')
    
    # 結果比較
    if result1 and result2:
        improvement = elapsed_time1 - elapsed_time2
        improvement_percent = (improvement / elapsed_time1) * 100 if elapsed_time1 > 0 else 0
        
        print(f'\n🏆 === 連続投稿テスト結果 ===')
        print(f'1回目: {elapsed_time1:.2f}秒（ログイン + 投稿画面準備）')
        print(f'2回目: {elapsed_time2:.2f}秒（実際投稿）')
        print(f'短縮時間: {improvement:.2f}秒')
        print(f'改善率: {improvement_percent:.1f}%')
        
        if improvement > 0:
            print('✅ 高速化効果確認！既存ログイン状態の再利用に成功')
        else:
            print('⚠️ 高速化効果は限定的でした')
        
        print('\n🎯 投稿内容確認:')
        print(f'1回目: "{test_message1}" (投稿画面準備のみ)')
        print(f'2回目: "{test_message2}" (実際にTwitterに投稿)')
        
        return True
    else:
        print(f'\n❌ 連続投稿テストで問題発生')
        print(f'1回目結果: {result1}, 2回目結果: {result2}')
        return False

def cleanup_browser():
    """テスト後のブラウザクリーンアップ"""
    print('\n🧹 === ブラウザクリーンアップ ===')
    try:
        from twitter_auto_post.browser_manager import kill_all_chromedrivers
        kill_all_chromedrivers()
        print('✅ ブラウザクリーンアップ完了')
    except Exception as e:
        print(f'⚠️ クリーンアップエラー: {e}')

if __name__ == "__main__":
    try:
        success = test_continuous_posting()
        
        if success:
            print('\n🎉 連続投稿テスト完全成功!')
            print('✅ 1回目: ログイン + 投稿画面準備')
            print('✅ 2回目: 既存ログイン状態で実際投稿')
            print('🚀 ブラウザ保持による高速化を確認')
        else:
            print('\n❌ 連続投稿テストに失敗しました')
            
    finally:
        # テスト後は必ずブラウザをクリーンアップ
        cleanup_browser()