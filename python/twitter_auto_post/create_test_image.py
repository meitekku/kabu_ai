#!/usr/bin/env python3
"""
テスト用画像作成スクリプト
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    pil_available = True
except ImportError:
    pil_available = False

import os

def create_test_image():
    """簡単なテスト画像を作成"""
    
    if pil_available:
        # PILで画像作成
        img = Image.new('RGB', (300, 200), color='lightblue')
        draw = ImageDraw.Draw(img)
        
        try:
            # システムフォントを使用
            font = ImageFont.load_default()
        except:
            font = None
        
        # テキストを描画
        text = "📱 Mobile Twitter Test Image"
        if font:
            draw.text((10, 80), text, fill='black', font=font)
        else:
            draw.text((10, 80), text, fill='black')
        
        # 画像を保存
        img.save('test_mobile_image.jpg', 'JPEG')
        print("✅ PILでテスト画像を作成しました: test_mobile_image.jpg")
        return True
        
    else:
        # PILがない場合は、macOSの sips コマンドで作成を試行
        try:
            import subprocess
            # 小さな無地の画像を作成（macOS sips使用）
            result = subprocess.run([
                'sips', '--createHFIF', '200', '200', 
                '--setProperty', 'format', 'jpeg',
                '--out', 'test_mobile_image.jpg'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print("✅ sipsでテスト画像を作成しました: test_mobile_image.jpg")
                return True
            else:
                print(f"sipsコマンドエラー: {result.stderr}")
                
        except Exception as e:
            print(f"sipsコマンド実行エラー: {e}")
        
        # 最後の手段：バイナリで最小限のJPEGヘッダーを作成
        try:
            # 最小限のJPEGファイル作成（1x1ピクセル）
            jpeg_data = bytes([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
                0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
                0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
                0x00, 0x00, 0xFF, 0xD9
            ])
            
            with open('test_mobile_image.jpg', 'wb') as f:
                f.write(jpeg_data)
            
            print("✅ 最小限のJPEGテスト画像を作成しました: test_mobile_image.jpg")
            return True
            
        except Exception as e:
            print(f"❌ テスト画像作成に失敗: {e}")
            return False

if __name__ == "__main__":
    success = create_test_image()
    
    if success and os.path.exists('test_mobile_image.jpg'):
        size = os.path.getsize('test_mobile_image.jpg')
        print(f"📊 ファイルサイズ: {size} bytes")
    else:
        print("❌ テスト画像の作成に失敗しました")