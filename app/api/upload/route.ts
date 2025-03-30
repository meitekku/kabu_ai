import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString } from '@/utils/common/randomString';
import { put } from '@vercel/blob';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    // BLOBトークンの存在確認
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN 環境変数が設定されていません');
      return NextResponse.json(
        { success: false, message: 'サーバー設定エラー: Blob ストレージの設定が不完全です' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }
    
    // ファイルが画像かチェック
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: '画像ファイルのみアップロードできます' },
        { status: 400 }
      );
    }
    
    // 現在の年月を取得して保存先ディレクトリを決定
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // ランダム文字列を生成して一意のファイル名を作成
    const fileExtension = path.extname(file.name);
    const fileNameWithoutExt = path.basename(file.name, fileExtension);
    const randomString = generateRandomString(8);
    const newFileName = `${fileNameWithoutExt}_${randomString}${fileExtension}`;
    
    // Vercel Blob にアップロード
    const blob = await put(`post_images/${year}/${month}/${newFileName}`, file, {
      access: 'public',
    });
    
    // 成功レスポンス
    return NextResponse.json({
      success: true,
      filePath: blob.url, // Blob URLを返す
      fileName: newFileName,
      message: 'ファイルのアップロードに成功しました'
    });
    
  } catch (error: unknown) {
    console.error('Unhandled upload error:', error);
    
    // Blob認証エラーの特別処理
    if (error instanceof Error && error.message.includes('No token found')) {
      return NextResponse.json(
        { success: false, message: 'Blob認証エラー: BLOB_READ_WRITE_TOKENが設定されていません' },
        { status: 500 }
      );
    }
    
    const message = error instanceof Error ? error.message : '不明な内部エラー';
    // エラーオブジェクトが持つ可能性のある追加情報もログに出力
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    return NextResponse.json(
      { success: false, message: `予期せぬアップロードエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

// config は通常不要ですが、もしNext.jsのバージョンや設定によっては必要になる場合があります
// export const config = {
//   api: {
//     bodyParser: false, // formData を扱う場合は false が推奨されることがある
//   },
// }; 