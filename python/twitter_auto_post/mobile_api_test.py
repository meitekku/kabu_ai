#!/usr/bin/env python3
"""
iPhone 14 Pro環境用 Twitter API テスト
実際のモバイル版APIエンドポイントをテスト
"""

import requests
import json
import sys
from pathlib import Path

def test_mobile_twitter_api():
    """iPhone 14 Pro環境でのTwitter APIをテスト"""
    print("📱" * 30)
    print("🔍 iPhone 14 Pro環境 Twitter API テスト")
    print("📱" * 30)
    
    # iPhone 14 Pro環境用テストメッセージ（title + 改行 + content形式）
    title = "【iPhone 14 Pro】株価速報"
    content = "iPhone 14 Pro環境での1文字タイピング + ペースト方式をテストしています。\nモバイル版Twitterでの投稿テストを実行中です。\n\nユーザーが報告した問題:\n• titleが入力された後にcontentは貼り付けされていない\n• imageも貼り付けられていない\n• 1度タイトルが貼られた後に全ての文字が消えて1文字だけが再度貼り付けられる\n\n#モバイルテスト #iPhone14Pro #TwitterAPI"
    
    full_message = f"{title}\n{content}"
    
    print(f"📱 iPhone 14 Pro環境テストメッセージ:")
    print(f"   タイトル: {title}")
    print(f"   コンテンツ: {content}")
    print(f"   全体 ({len(full_message)}文字):")
    print(f"   {repr(full_message)}")
    
    # モバイル版APIエンドポイント
    api_url = "http://localhost:3000/api/twitter/post_playwright_mobile"
    
    # リクエストデータ
    request_data = {
        "message": full_message,
        "textOnly": True,
        "actuallyPost": False,  # テストモード
        "imagePaths": []
    }
    
    print(f"\n📡 iPhone 14 Pro用APIリクエスト送信...")
    print(f"   URL: {api_url}")
    print(f"   データ: {json.dumps(request_data, indent=2, ensure_ascii=False)}")
    
    try:
        # APIを呼び出し
        response = requests.post(
            api_url,
            json=request_data,
            timeout=300  # 5分でタイムアウト
        )
        
        print(f"\n📥 iPhone 14 Pro用APIレスポンス:")
        print(f"   ステータス: {response.status_code}")
        print(f"   ヘッダー: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   JSON: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                if result.get('success'):
                    print("\n✅ iPhone 14 Pro用API呼び出し成功!")
                    
                    # 詳細結果の解析
                    details = result.get('details', {})
                    stdout = details.get('stdout', '')
                    stderr = details.get('stderr', '')
                    
                    print(f"\n📤 iPhone 14 Pro用Pythonスクリプト出力:")
                    if stdout:
                        print("STDOUT:")
                        print(stdout)
                    else:
                        print("STDOUT: (なし)")
                    
                    if stderr:
                        print("STDERR:")
                        print(stderr)
                    else:
                        print("STDERR: (なし)")
                    
                    # 特定の問題を特定
                    print("\n🔍 問題分析:")
                    
                    # 1. テキスト入力の確認
                    if 'モバイル版テキスト入力完了' in stdout:
                        print("✅ モバイル版テキスト入力は完了している")
                    else:
                        print("❌ モバイル版テキスト入力が完了していない可能性")
                    
                    # 2. 1文字タイピング+ペースト方式の確認
                    if 'モバイル版1文字タイピング+ペースト方式で完全成功' in stdout:
                        print("✅ モバイル版1文字タイピング+ペースト方式が成功")
                    else:
                        print("❌ モバイル版1文字タイピング+ペースト方式に問題がある可能性")
                    
                    # 3. ペースト処理の確認
                    if 'モバイル版2文字目以降をペースト' in stdout:
                        print("✅ モバイル版ペースト処理は実行されている")
                    else:
                        print("❌ モバイル版ペースト処理が実行されていない可能性")
                    
                    # 4. タイトルとコンテンツの確認
                    if 'タイトルとコンテンツ両方が正しく入力されています' in stdout:
                        print("✅ タイトルとコンテンツ両方が正しく入力されている")
                    elif 'タイトル部分のみ入力されています' in stdout:
                        print("⚠️ タイトルのみ入力、コンテンツが不足している - ユーザー報告の問題と一致")
                    elif 'コンテンツ部分のみ入力されています' in stdout:
                        print("⚠️ コンテンツのみ入力、タイトルが不足している")
                    else:
                        print("❌ タイトルもコンテンツも正しく入力されていない")
                    
                    # 5. テキストクリアの問題確認
                    if '全ての文字が消えて' in stdout:
                        print("⚠️ テキストクリア問題が発生 - ユーザー報告の問題と一致")
                    
                    # 6. デバイス情報確認
                    device_info = details.get('device', 'unknown')
                    if device_info == 'iPhone 14 Pro':
                        print(f"✅ iPhone 14 Pro環境で実行確認: {device_info}")
                    
                else:
                    print(f"\n❌ iPhone 14 Pro用API呼び出し失敗: {result.get('error', '不明なエラー')}")
                    
            except json.JSONDecodeError:
                print(f"   テキスト: {response.text}")
                
        else:
            print(f"\n❌ HTTPエラー: {response.status_code}")
            print(f"   内容: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print(f"\n❌ 接続エラー: Next.jsサーバーが起動していません")
        print("   解決方法: npm run dev を実行してください")
        return False
        
    except requests.exceptions.Timeout:
        print(f"\n❌ タイムアウトエラー: APIが5分以内に応答しませんでした")
        return False
        
    except Exception as e:
        print(f"\n❌ 予期しないエラー: {e}")
        return False
    
    return True

def test_mobile_with_image():
    """iPhone 14 Pro環境で画像付きテスト"""
    print("\n" + "📱" * 30)
    print("🖼️ iPhone 14 Pro環境 画像付きTwitter APIテスト")
    print("📱" * 30)
    
    # Chart.js風のテストメッセージ
    title = "【iPhone 14 Pro】チャート分析"
    content = "iPhone 14 Pro環境でChart.js生成画像の投稿テストを実行中です。\n\nテスト項目:\n• 1文字タイピング + ペースト方式\n• Chart.js画像のアップロード\n• モバイル版Twitter UIでの動作\n\n#iPhone14Pro #チャート #モバイルテスト"
    
    full_message = f"{title}\n{content}"
    
    # 実際の画像パスを探す
    possible_image_paths = [
        "/Users/takahashimika/Dropbox/web_kabu_ai/public/uploads/chart_image.png",
        "/Users/takahashimika/Dropbox/web_kabu_ai/public/uploads/test_chart.png",
    ]
    
    existing_images = []
    for path in possible_image_paths:
        if Path(path).exists():
            existing_images.append(path)
            print(f"📷 利用可能画像: {path}")
    
    if not existing_images:
        print("⚠️ テスト用画像が見つかりません - 画像なしでテスト")
        existing_images = []
    
    # APIエンドポイント
    api_url = "http://localhost:3000/api/twitter/post_playwright_mobile"
    
    # リクエストデータ
    request_data = {
        "message": full_message,
        "textOnly": False,
        "actuallyPost": False,  # テストモード
        "imagePaths": existing_images
    }
    
    print(f"\n📡 iPhone 14 Pro用画像付きAPIリクエスト送信...")
    print(f"   メッセージ: {full_message}")
    print(f"   画像数: {len(existing_images)}枚")
    
    try:
        response = requests.post(
            api_url,
            json=request_data,
            timeout=300
        )
        
        print(f"\n📥 iPhone 14 Pro用APIレスポンス: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   成功: {result.get('success')}")
            
            # 画像アップロード関連の出力をチェック
            details = result.get('details', {})
            stdout = details.get('stdout', '')
            
            print("\n🔍 画像アップロード分析:")
            
            if '画像アップロード' in stdout:
                print("✅ 画像アップロード処理は実行されている")
            else:
                print("❌ 画像アップロード処理が実行されていない - ユーザー報告の問題と一致")
            
            if '画像アップロード成功' in stdout:
                print("✅ 画像アップロードが成功している")
            else:
                print("❌ 画像アップロードが失敗している - ユーザー報告の問題と一致")
                
        else:
            print(f"❌ HTTPエラー: {response.status_code}")
            
    except Exception as e:
        print(f"❌ iPhone 14 Pro用画像付きテストエラー: {e}")
        return False
    
    return True

def comprehensive_mobile_test():
    """包括的なiPhone 14 Pro環境テスト"""
    print("📱" * 50)
    print("🧪 包括的 iPhone 14 Pro環境 TwitterPythonButton動作テスト")
    print("📱" * 50)
    
    print("\nユーザー報告の問題:")
    print("1. titleが入力された後にcontentは貼り付けされていない")
    print("2. imageも貼り付けられていない") 
    print("3. 1度タイトルが貼られた後に全ての文字が消えて1文字だけが再度貼り付けられる")
    
    print("\n検証項目:")
    print("• iPhone 14 Pro環境でのモバイル版Twitter動作")
    print("• 1文字タイピング + ペースト方式の動作")
    print("• title + content の正しい入力")
    print("• Chart.js画像のアップロード")
    print("• ユーザー報告問題の再現と修正確認")
    
    # 基本テスト
    print("\n" + "="*60)
    print("📱 テスト1: 基本的なテキスト入力テスト")
    print("="*60)
    basic_success = test_mobile_twitter_api()
    
    # 画像付きテスト
    print("\n" + "="*60)
    print("📱 テスト2: 画像付き投稿テスト")
    print("="*60)
    image_success = test_mobile_with_image()
    
    print("\n" + "📱" * 50)
    print("📊 iPhone 14 Pro環境テスト結果サマリー")
    print("📱" * 50)
    print(f"基本テスト: {'✅ 成功' if basic_success else '❌ 失敗'}")
    print(f"画像テスト: {'✅ 成功' if image_success else '❌ 失敗'}")
    
    if basic_success or image_success:
        print("\n💡 次のステップ:")
        print("1. iPhone 14 Pro環境でブラウザを開いてTwitterの投稿画面を確認")
        print("2. モバイル版でテキストが正しく入力されているか確認")
        print("3. 画像が正しくアップロードされているか確認")
        print("4. 1文字タイピング+ペースト方式がモバイル版で動作しているか確認")
        print("5. ユーザー報告の問題が修正されているか確認")
    else:
        print("\n🔧 iPhone 14 Pro環境トラブルシューティング:")
        print("1. Next.jsサーバーが起動しているか確認 (npm run dev)")
        print("2. モバイル版APIエンドポイントが正しく動作しているか確認")
        print("3. iPhone 14 Pro環境シミュレーションが正しく動作しているか確認")
        print("4. Seleniumドライバーが正しくインストールされているか確認")

if __name__ == "__main__":
    print("📱 iPhone 14 Pro環境 TwitterPythonButton動作テスト")
    print("実際のモバイル版APIエンドポイントを呼び出して問題を特定・修正します")
    
    comprehensive_mobile_test()