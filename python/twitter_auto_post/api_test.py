#!/usr/bin/env python3
"""
Twitter API テスト - 実際のAPIエンドポイントをテスト
"""

import requests
import json
import sys
from pathlib import Path

def test_twitter_api():
    """実際のTwitter APIをテスト"""
    print("=" * 60)
    print("🔍 Twitter API 直接テスト")
    print("=" * 60)
    
    # テストメッセージ（title + 改行 + content形式）
    title = "【テスト】株価情報"
    content = "これはTwitterPythonButtonの動作テストです。\n1文字タイピング + 残りペースト方式の確認を行っています。\n\n#株価 #テスト"
    
    full_message = f"{title}\n{content}"
    
    print(f"📝 テストメッセージ:")
    print(f"   タイトル: {title}")
    print(f"   コンテンツ: {content}")
    print(f"   全体 ({len(full_message)}文字):")
    print(f"   {repr(full_message)}")
    
    # APIエンドポイント
    api_url = "http://localhost:3000/api/twitter/post_playwright"
    
    # リクエストデータ
    request_data = {
        "message": full_message,
        "textOnly": True,
        "actuallyPost": False,  # テストモード
        "imagePaths": []
    }
    
    print(f"\n📡 APIリクエスト送信...")
    print(f"   URL: {api_url}")
    print(f"   データ: {json.dumps(request_data, indent=2, ensure_ascii=False)}")
    
    try:
        # APIを呼び出し
        response = requests.post(
            api_url,
            json=request_data,
            timeout=300  # 5分でタイムアウト
        )
        
        print(f"\n📥 APIレスポンス:")
        print(f"   ステータス: {response.status_code}")
        print(f"   ヘッダー: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   JSON: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                if result.get('success'):
                    print("\n✅ API呼び出し成功!")
                    
                    # 詳細結果の解析
                    details = result.get('details', {})
                    stdout = details.get('stdout', '')
                    stderr = details.get('stderr', '')
                    
                    print(f"\n📤 Pythonスクリプト出力:")
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
                    if 'テキスト入力完了' in stdout:
                        print("✅ テキスト入力は完了している")
                    else:
                        print("❌ テキスト入力が完了していない可能性")
                    
                    if '1文字タイピング+ペースト方式で完全成功' in stdout:
                        print("✅ 1文字タイピング+ペースト方式が成功")
                    else:
                        print("❌ 1文字タイピング+ペースト方式に問題がある可能性")
                    
                    if 'ペースト' in stdout:
                        print("✅ ペースト処理は実行されている")
                    else:
                        print("❌ ペースト処理が実行されていない可能性")
                    
                else:
                    print(f"\n❌ API呼び出し失敗: {result.get('error', '不明なエラー')}")
                    
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

def test_with_image():
    """画像付きテスト"""
    print("\n" + "=" * 60)
    print("🖼️ 画像付きTwitter APIテスト")
    print("=" * 60)
    
    # Chart.js風のテストメッセージ
    title = "【チャート】株価分析結果"
    content = "本日の市場動向をチャートで分析しました。\n詳細な技術指標も含まれています。\n\n#株価チャート #投資分析"
    
    full_message = f"{title}\n{content}"
    
    # 実際の画像パスを探す
    possible_image_paths = [
        "/Users/takahashimika/Dropbox/web_kabu_ai/public/uploads/chart_image.png",
        "/Users/takahashimika/Dropbox/web_kabu_ai/public/uploads/test_chart.png",
        # 他の可能な画像パス
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
    api_url = "http://localhost:3000/api/twitter/post_playwright"
    
    # リクエストデータ
    request_data = {
        "message": full_message,
        "textOnly": False,
        "actuallyPost": False,  # テストモード
        "imagePaths": existing_images
    }
    
    print(f"\n📡 画像付きAPIリクエスト送信...")
    print(f"   メッセージ: {full_message}")
    print(f"   画像数: {len(existing_images)}枚")
    
    try:
        response = requests.post(
            api_url,
            json=request_data,
            timeout=300
        )
        
        print(f"\n📥 APIレスポンス: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   成功: {result.get('success')}")
            
            # 画像アップロード関連の出力をチェック
            details = result.get('details', {})
            stdout = details.get('stdout', '')
            
            if '画像アップロード' in stdout:
                print("✅ 画像アップロード処理は実行されている")
            else:
                print("❌ 画像アップロード処理が実行されていない")
            
            if '画像アップロード成功' in stdout:
                print("✅ 画像アップロードが成功している")
            else:
                print("❌ 画像アップロードが失敗している可能性")
                
        else:
            print(f"❌ HTTPエラー: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 画像付きテストエラー: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 TwitterPythonButton API動作テスト")
    print("実際のAPIエンドポイントを呼び出して問題を特定します")
    
    # 基本テスト
    basic_success = test_twitter_api()
    
    # 画像付きテスト
    image_success = test_with_image()
    
    print("\n" + "=" * 60)
    print("📊 テスト結果サマリー")
    print("=" * 60)
    print(f"基本テスト: {'✅ 成功' if basic_success else '❌ 失敗'}")
    print(f"画像テスト: {'✅ 成功' if image_success else '❌ 失敗'}")
    
    if basic_success or image_success:
        print("\n💡 次のステップ:")
        print("1. ブラウザを開いてTwitterの投稿画面を確認")
        print("2. テキストが正しく入力されているか確認")
        print("3. 画像が正しくアップロードされているか確認")
        print("4. 1文字タイピング+ペースト方式が動作しているか確認")
    else:
        print("\n🔧 トラブルシューティング:")
        print("1. Next.jsサーバーが起動しているか確認 (npm run dev)")
        print("2. Playwrightブラウザがインストールされているか確認")
        print("3. Pythonの依存関係が正しくインストールされているか確認")