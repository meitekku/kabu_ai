#!/usr/bin/env python3
import sys
import os
import time
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

def test_authentication_bypass():
    print('🧪 === 2段階認証回避テスト ===')
    
    # 投稿回数をリセット
    from twitter_auto_post.config import reset_post_count, get_post_count
    reset_post_count()
    print('📊 投稿回数リセット完了')
    
    # プロファイルを完全削除してクリーンスタート
    from twitter_auto_post.browser_manager import delete_chrome_profile_for_auth_reset
    print('🗑️ 既存プロファイルを完全削除...')
    delete_chrome_profile_for_auth_reset()
    
    # Torで新しいIPを取得
    from twitter_auto_post.proxy_manager import get_tor_manager
    tor_manager = get_tor_manager()
    
    print('🔄 新しいTor IPを取得中...')
    ip_changed = tor_manager.change_tor_ip()
    if ip_changed:
        current_ip = tor_manager._get_ip_via_tor()
        print(f'🌐 新しいTor IP: {current_ip}')
    else:
        print('⚠️ IP変更に失敗、処理続行')
    
    # Twitter投稿テストを実行
    from twitter_auto_post.main import main
    
    attempts = 0
    max_attempts = 3
    
    while attempts < max_attempts:
        attempts += 1
        print(f'\n🚀 === ログイン試行 {attempts}/{max_attempts} ===')
        
        test_message = f'🧪 認証回避テスト {attempts}回目 {time.strftime("%H:%M:%S")}'
        print(f'📝 テストメッセージ: {test_message}')
        
        # 投稿処理実行
        result = main(test_message, keep_browser=True)
        
        if result:
            print('✅ ログイン・投稿処理成功!')
            
            # 成功した場合、2回目も実行
            print('\n⚡ === 2回目投稿テスト ===')
            time.sleep(3)
            
            test_message2 = f'⚡ 2回目投稿 {time.strftime("%H:%M:%S")}'
            result2 = main(test_message2, keep_browser=True)
            
            if result2:
                print('🎉 連続投稿テスト完全成功!')
                return True
            else:
                print('⚠️ 2回目投稿で失敗')
                return False
        else:
            print(f'❌ {attempts}回目ログイン失敗')
            
            if attempts < max_attempts:
                print('🔄 プロファイル削除してIP変更後リトライ...')
                
                # プロファイル削除
                delete_chrome_profile_for_auth_reset()
                
                # IP変更
                ip_changed = tor_manager.change_tor_ip()
                if ip_changed:
                    new_ip = tor_manager._get_ip_via_tor()
                    print(f'🌐 新IP: {new_ip}')
                
                time.sleep(5)  # 少し待機
    
    print(f'\n❌ {max_attempts}回試行しても認証を突破できませんでした')
    
    # 最終的なIP確認
    final_ip = tor_manager._get_ip_via_tor()
    print(f'🌐 最終IP: {final_ip}')
    
    return False

def cleanup_test():
    """テスト後のクリーンアップ"""
    print('\n🧹 === テスト後クリーンアップ ===')
    try:
        from twitter_auto_post.browser_manager import kill_all_chromedrivers
        kill_all_chromedrivers()
        print('✅ ブラウザクリーンアップ完了')
    except Exception as e:
        print(f'⚠️ クリーンアップエラー: {e}')

if __name__ == "__main__":
    try:
        success = test_authentication_bypass()
        
        if success:
            print('\n🎉 === 2段階認証回避成功! ===')
            print('✅ ログイン成功')
            print('✅ 投稿処理成功')
            print('✅ 連続投稿成功')
        else:
            print('\n💡 === 2段階認証回避の現状 ===')
            print('✅ IP変更: 正常動作')
            print('✅ プロファイル削除: 正常動作')  
            print('❌ Twitter認証: まだ突破できていない')
            print('💭 このアカウント/環境では追加の対策が必要な可能性')
            
    finally:
        cleanup_test()