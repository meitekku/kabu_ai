"""
Selenium fallback implementation for Twitter posting
"""

def selenium_twitter_post(message, image_paths=None, test_mode=True):
    """Seleniumベースの投稿処理"""
    try:
        from .main import main as selenium_main
    except ImportError:
        # 直接実行時のインポート
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from main import main as selenium_main
    
    # 実際の投稿モードを判定
    actually_post = not test_mode
    
    # Seleniumで実行
    success = selenium_main(
        message=message,
        image_path=image_paths[0] if image_paths else None,
        text_only=(not image_paths),
        keep_browser=False,
        use_system_profile=False
    )
    
    if success:
        if actually_post:
            print("✅ モバイルツイート投稿完了！")
            print("✅ === モバイル版投稿完了成功！ ===")
        else:
            print("✅ === モバイル版投稿テスト成功！ ===")
    else:
        print("❌ モバイル版投稿失敗")
    
    return success