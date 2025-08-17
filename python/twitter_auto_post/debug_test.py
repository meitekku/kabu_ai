#!/usr/bin/env python3
"""
TwitterPythonButton動作デバッグ用テストスクリプト
実際の問題を特定するための詳細テスト
"""

import sys
import os
import time
from pathlib import Path

# パスを追加
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

def test_playwright_integration():
    """Playwright統合テスト"""
    print("=" * 60)
    print("🔍 TwitterPythonButton 動作デバッグテスト")
    print("=" * 60)
    
    # テストメッセージの準備（title + 改行 + content形式）
    title = "テストタイトル"
    content = "これはテスト用のコンテンツです。\n1文字タイピング + ペースト方式をテストしています。"
    full_message = f"{title}\n{content}"
    
    print(f"📝 テストメッセージ:")
    print(f"   タイトル: {title}")
    print(f"   コンテンツ: {content}")
    print(f"   全体: {full_message}")
    print(f"   文字数: {len(full_message)}")
    
    # テスト用画像パスの確認
    test_image_paths = []
    
    # Chart.js画像のテスト用パス（実際のパスに置き換える）
    possible_image_paths = [
        "/Users/takahashimika/Dropbox/web_kabu_ai/public/uploads/chart_image.png",
        "/Users/takahashimika/Dropbox/web_kabu_ai/public/uploads/test_chart.png",
        # 他の可能なパス
    ]
    
    for path in possible_image_paths:
        if Path(path).exists():
            test_image_paths.append(path)
            print(f"📷 テスト画像発見: {path}")
    
    if not test_image_paths:
        print("⚠️ テスト用画像が見つかりません - テキストのみテスト")
    
    # Playwright Twitter マネージャーをインポートしてテスト
    try:
        from playwright_twitter import PlaywrightTwitterManager, PLAYWRIGHT_AVAILABLE
        
        if not PLAYWRIGHT_AVAILABLE:
            print("❌ Playwright未インストール")
            return False
        
        print("🎭 Playwrightマネージャー開始...")
        
        # 詳細デバッグモードで実行
        with PlaywrightTwitterManager(headless=False) as twitter:
            print("✅ ブラウザ起動成功")
            
            # 1. Twitter移動テスト
            print("\n--- 1. Twitter移動テスト ---")
            if twitter.navigate_to_twitter():
                print("✅ Twitter移動成功")
            else:
                print("❌ Twitter移動失敗")
                return False
            
            # 2. ログイン状態チェック
            print("\n--- 2. ログイン状態チェック ---")
            is_logged_in = twitter.check_login_status()
            
            if not is_logged_in:
                print("🔐 手動ログイン待機開始...")
                is_logged_in = twitter.wait_for_manual_login(timeout=180)
            
            if not is_logged_in:
                print("❌ ログインに失敗")
                return False
            
            print("✅ ログイン完了")
            
            # 3. 投稿ボタンクリックテスト
            print("\n--- 3. 投稿ボタンクリックテスト ---")
            
            post_selectors = [
                '[data-testid="SideNav_NewTweet_Button"]',
                'a[href="/compose/tweet"]',
                '[aria-label*="ツイート"]',
                '[aria-label*="Tweet"]'
            ]
            
            post_button = None
            for selector in post_selectors:
                try:
                    post_button = twitter.page.query_selector(selector)
                    if post_button:
                        print(f"✅ 投稿ボタン発見: {selector}")
                        break
                except:
                    continue
            
            if not post_button:
                print("❌ 投稿ボタンが見つかりません")
                return False
            
            # 投稿ボタンをクリック
            print("投稿ボタンクリック...")
            twitter.natural_click(post_button)
            time.sleep(3)
            
            # 4. テキストエリア検索テスト
            print("\n--- 4. テキストエリア検索テスト ---")
            text_selectors = [
                '[data-testid="tweetTextarea_0"]',
                '.public-DraftEditor-content',
                '[aria-label*="ツイートを入力"]',
                '[aria-label*="Tweet text"]',
                '[contenteditable="true"]'
            ]
            
            text_area = None
            for selector in text_selectors:
                try:
                    text_area = twitter.page.query_selector(selector)
                    if text_area:
                        print(f"✅ テキストエリア発見: {selector}")
                        break
                except:
                    continue
            
            if not text_area:
                print("❌ テキストエリアが見つかりません")
                return False
            
            # 5. 1文字タイピング+ペーストテスト
            print("\n--- 5. 1文字タイピング+ペーストテスト ---")
            print(f"テスト内容: {full_message}")
            
            success = twitter.one_char_type_and_paste(text_area, full_message)
            
            if success:
                print("✅ テキスト入力成功")
                
                # 入力結果確認
                try:
                    final_text = text_area.input_value()
                except:
                    try:
                        final_text = text_area.text_content() or ""
                    except:
                        final_text = ""
                
                print(f"📝 入力結果 ({len(final_text)}文字): {final_text}")
                
                # 期待値との比較
                if title in final_text and content in final_text:
                    print("✅ タイトルとコンテンツ両方が含まれています")
                elif title in final_text:
                    print("⚠️ タイトルのみ含まれています - コンテンツが不足")
                elif content in final_text:
                    print("⚠️ コンテンツのみ含まれています - タイトルが不足")
                else:
                    print("❌ タイトルもコンテンツも正しく入力されていません")
                
            else:
                print("❌ テキスト入力失敗")
                return False
            
            # 6. 画像アップロードテスト（画像がある場合）
            if test_image_paths:
                print("\n--- 6. 画像アップロードテスト ---")
                
                for i, image_path in enumerate(test_image_paths):
                    print(f"📷 画像 {i+1}/{len(test_image_paths)}: {Path(image_path).name}")
                    
                    # ファイル入力要素を探す
                    file_input_selectors = [
                        'input[type="file"][accept*="image"]',
                        'input[type="file"]',
                        '[data-testid="fileInput"]'
                    ]
                    
                    upload_success = False
                    for selector in file_input_selectors:
                        try:
                            file_input = twitter.page.query_selector(selector)
                            if file_input:
                                print(f"✅ ファイル入力要素発見: {selector}")
                                file_input.set_input_files(image_path)
                                time.sleep(2)
                                
                                # アップロード確認
                                if twitter.verify_image_upload():
                                    print("✅ 画像アップロード成功")
                                    upload_success = True
                                    break
                                else:
                                    print("⚠️ アップロード確認失敗")
                        except Exception as e:
                            print(f"⚠️ {selector} エラー: {e}")
                            continue
                    
                    if not upload_success:
                        print("❌ 画像アップロード失敗")
            
            # 7. 最終確認
            print("\n--- 7. 最終確認 ---")
            print("テスト完了 - ブラウザは開いたままにします")
            print("手動で結果を確認してください:")
            print("1. テキストが正しく入力されているか")
            print("2. 画像が正しくアップロードされているか")
            print("3. 全体的な動作が期待通りか")
            
            # ブラウザを開いたまま維持
            input("Enterキーを押してテストを終了してください...")
            
            return True
            
    except Exception as e:
        print(f"❌ テストエラー: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_playwright_integration()
    
    if success:
        print("\n✅ デバッグテスト完了")
        print("結果を確認して、問題がある場合は詳細を報告してください")
    else:
        print("\n❌ デバッグテスト失敗")
        print("エラーの詳細を確認して修正が必要です")