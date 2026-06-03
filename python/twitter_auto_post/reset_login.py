#!/usr/bin/env python3
"""
Playwright プロファイルリセットツール
既存のログイン情報をクリアして新規ログインを強制する
"""

import os
import shutil
from pathlib import Path

def reset_playwright_profile():
    """Playwrightプロファイルをリセット"""
    
    # プロファイルディレクトリのパス
    current_dir = Path(__file__).parent.parent.parent
    
    profiles = [
        current_dir / "twitter_chrome_profile",      # 通常版
        current_dir / "twitter_mobile_profile"       # モバイル版
    ]
    
    print("🔄 Playwright プロファイルリセット開始")
    print("=" * 50)
    
    for profile_dir in profiles:
        if profile_dir.exists():
            try:
                print(f"📂 プロファイル削除中: {profile_dir}")
                shutil.rmtree(profile_dir)
                print(f"✅ 削除完了: {profile_dir.name}")
            except Exception as e:
                print(f"❌ 削除エラー: {e}")
        else:
            print(f"ℹ️ プロファイル未発見: {profile_dir.name}")
    
    print("\n🎉 プロファイルリセット完了！")
    print("次回の実行時に新規ログインが必要になります。")

def reset_specific_profile(profile_type="both"):
    """特定のプロファイルのみリセット"""
    
    current_dir = Path(__file__).parent.parent.parent
    
    if profile_type == "desktop" or profile_type == "both":
        desktop_profile = current_dir / "twitter_chrome_profile"
        if desktop_profile.exists():
            print(f"🖥️ デスクトップ版プロファイル削除: {desktop_profile}")
            shutil.rmtree(desktop_profile)
            print("✅ デスクトップ版プロファイル削除完了")
    
    if profile_type == "mobile" or profile_type == "both":
        mobile_profile = current_dir / "twitter_mobile_profile"
        if mobile_profile.exists():
            print(f"📱 モバイル版プロファイル削除: {mobile_profile}")
            shutil.rmtree(mobile_profile)
            print("✅ モバイル版プロファイル削除完了")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        profile_type = sys.argv[1].lower()
        if profile_type in ["desktop", "mobile", "both"]:
            reset_specific_profile(profile_type)
        else:
            print("使用方法: python reset_login.py [desktop|mobile|both]")
    else:
        reset_playwright_profile()