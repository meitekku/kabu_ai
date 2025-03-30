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
    const dirPath = path.join(process.cwd(), 'public', 'post_images', String(year), month);
    
    // ディレクトリが存在しなければ作成
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create directory:', error);
      return NextResponse.json(
        { success: false, message: 'ディレクトリの作成に失敗しました' },
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
    const publicPath = `/post_images/${year}/${month}/${newFileName}`;
    
    // ファイルを読み込み
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // ファイルを保存
    await writeFile(filePath, buffer);
    
    return NextResponse.json({
      success: true,
      filePath: publicPath,
      message: 'アップロードに成功しました'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: '内部エラーが発生しました' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 