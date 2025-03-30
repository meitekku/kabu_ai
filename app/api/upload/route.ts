import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString } from '@/utils/common/randomString';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

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
    // 注意: Vercelなどの環境では public ディレクトリへの書き込みは失敗する可能性が高いです
    const dirPath = path.join(process.cwd(), 'public', 'post_images', String(year), month);
    // Vercelで一時的に試す場合は /tmp ディレクトリを使うことも考えられますが、永続的ではありません
    // const dirPath = path.join('/tmp', 'post_images', String(year), month);
    
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error: unknown) {
      console.error('Failed to create directory:', dirPath, error);
      // エラーオブジェクトの内容をログに出力 (より安全なアクセス)
      let errorMessage = '不明なエラー';
      let errorCode: string | undefined;
      if (error instanceof Error) {
        errorMessage = error.message;
        // NodeJS.ErrnoException のような型を想定して code を取得
        errorCode = (error as NodeJS.ErrnoException).code;
      }
      console.error('Directory creation error details:', JSON.stringify(error));
      return NextResponse.json(
        { success: false, message: `ディレクトリの作成に失敗しました (${dirPath}): ${errorCode || errorMessage}` },
        { status: 500 }
      );
    }
    
    // ランダム文字列を生成して一意のファイル名を作成
    const fileExtension = path.extname(file.name);
    const fileNameWithoutExt = path.basename(file.name, fileExtension);
    const randomString = generateRandomString(8);
    const newFileName = `${fileNameWithoutExt}_${randomString}${fileExtension}`;
    
    // ファイルパスを作成
    const filePath = path.join(dirPath, newFileName);
    // public ディレクトリ基準のパス (Vercelで /tmp を使う場合は調整が必要)
    const publicPath = `/post_images/${year}/${month}/${newFileName}`;
    
    // ファイルを読み込み
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // ファイルを保存
    try {
      await writeFile(filePath, buffer);
    } catch (error: unknown) {
      console.error('Failed to write file:', filePath, error);
      // エラーオブジェクトの内容をログに出力 (より安全なアクセス)
      let errorMessage = '不明なエラー';
      let errorCode: string | undefined;
      if (error instanceof Error) {
        errorMessage = error.message;
        errorCode = (error as NodeJS.ErrnoException).code;
      }
      console.error('File writing error details:', JSON.stringify(error));
      return NextResponse.json(
        { success: false, message: `ファイルの書き込みに失敗しました (${filePath}): ${errorCode || errorMessage}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      filePath: publicPath,
      message: 'アップロードに成功しました'
    });
    
  } catch (error: unknown) {
    console.error('Unhandled upload error:', error);
    // エラーメッセージを取得 (より安全なアクセス)
    const message = error instanceof Error ? error.message : '不明な内部エラー';
    return NextResponse.json(
      // 想定外のエラーの場合もメッセージを返す
      { success: false, message: `予期せぬアップロードエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}

// config は通常不要ですが、もしNext.jsのバージョンや設定によっては必要になる場合があります
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// }; 