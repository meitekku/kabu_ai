import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString } from '@/utils/common/randomString';
import path from 'path';
import fs from 'fs/promises';

// アップロード先のベースディレクトリ（ビルドで消えない永続ディレクトリ）
const UPLOAD_BASE_DIR = process.env.NODE_ENV === 'production'
  ? '/var/www/kabu_ai_uploads'
  : path.join(process.cwd(), 'public/uploads');

export async function POST(req: NextRequest) {
  try {
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
    
    // 保存先ディレクトリのパスを作成
    const uploadDir = path.join(UPLOAD_BASE_DIR, 'post_images', year.toString(), month);

    // ディレクトリが存在しない場合は作成
    await fs.mkdir(uploadDir, { recursive: true });

    // ランダム文字列を生成して一意のファイル名を作成
    const fileExtension = path.extname(file.name);
    const fileNameWithoutExt = path.basename(file.name, fileExtension);
    const randomString = generateRandomString(8);
    const newFileName = `${fileNameWithoutExt}_${randomString}${fileExtension}`;

    // ファイルの保存先パス
    const filePath = path.join(uploadDir, newFileName);

    // ArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイルを保存
    await fs.writeFile(filePath, buffer);
    await fs.chmod(filePath, 0o777);
    
    // 相対パスを生成（URL用）
    const relativePath = `/uploads/post_images/${year}/${month}/${newFileName}`;
    
    // 成功レスポンス
    return NextResponse.json({
      success: true,
      filePath: relativePath,
      fileName: newFileName,
      message: 'ファイルのアップロードに成功しました'
    });
    
  } catch (error: unknown) {
    console.error('Unhandled upload error:', error);
    
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

// Next.js App Router では formData を使用するため、bodyParser の設定は不要
// 代わりに route segment config を使用する場合は以下のようにエクスポート
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';