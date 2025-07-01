// app/api/twitter/post_selenium/save-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface SaveImageRequest {
  imageData: string; // Base64エンコードされた画像データ
}

interface SaveImageResponse {
  success: boolean;
  path?: string;
  absolutePath?: string;
  filename?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveImageRequest = await request.json();
    
    if (!body.imageData) {
      return NextResponse.json<SaveImageResponse>(
        {
          success: false,
          error: '画像データが必要です'
        },
        { status: 400 }
      );
    }
    
    // Base64データからヘッダーを削除
    const base64Data = body.imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 画像の拡張子を判定
    const imageType = body.imageData.match(/data:image\/(\w+);base64/);
    const extension = imageType ? imageType[1] : 'png';
    
    // 一時ファイル名を生成
    const timestamp = new Date().getTime();
    const filename = `twitter_upload_${timestamp}.${extension}`;
    
    // 保存ディレクトリ（publicディレクトリまたはtmpディレクトリ）
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // ディレクトリが存在しない場合は作成
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    // ファイルパス
    const filePath = path.join(uploadDir, filename);
    const relativePath = path.join('public', 'uploads', filename);
    
    // ファイルを保存
    await fs.writeFile(filePath, buffer);
    
    console.log(`✅ 画像を保存しました: ${filePath}`);
    
    return NextResponse.json<SaveImageResponse>(
      {
        success: true,
        path: relativePath,
        absolutePath: filePath,
        filename: filename
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('💥 画像保存エラー:', error);
    
    return NextResponse.json<SaveImageResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '画像の保存に失敗しました'
      },
      { status: 500 }
    );
  }
}

// GETリクエストハンドラー（APIの動作確認用）
export async function GET() {
  return NextResponse.json({
    message: '画像保存API',
    version: '1.0',
    endpoints: {
      POST: {
        description: 'Base64画像データをファイルとして保存します',
        body: {
          imageData: 'Base64エンコードされた画像データ（data:image/png;base64,... 形式）'
        },
        response: {
          success: '成功/失敗のブール値',
          path: '相対パス',
          absolutePath: '絶対パス',
          filename: 'ファイル名',
          error: 'エラーメッセージ'
        }
      }
    }
  });
}