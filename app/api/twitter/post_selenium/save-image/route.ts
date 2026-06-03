// app/api/twitter/post_selenium/save-image/route.ts
// 画像保存API - TwitterPythonButtonから呼び出される
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
      return NextResponse.json<SaveImageResponse>({
        success: false,
        error: '画像データが提供されていません'
      }, { status: 400 });
    }
    
    // データURLから実際のBase64データを抽出
    const base64Data = body.imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 保存先ディレクトリ
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // ディレクトリが存在しない場合は作成
    await fs.mkdir(uploadDir, { recursive: true });
    
    // ユニークなファイル名を生成
    const timestamp = Date.now();
    const filename = `twitter_upload_${timestamp}.png`;
    const filePath = path.join(uploadDir, filename);
    
    // ファイルを保存
    await fs.writeFile(filePath, buffer);
    
    
    // レスポンス
    return NextResponse.json<SaveImageResponse>({
      success: true,
      path: `/uploads/${filename}`,
      absolutePath: filePath,
      filename: filename
    });
    
  } catch (error) {
    return NextResponse.json<SaveImageResponse>({
      success: false,
      error: error instanceof Error ? error.message : '画像の保存に失敗しました'
    }, { status: 500 });
  }
}

// GETリクエストハンドラー（APIの動作確認用）
export function GET() {
  return NextResponse.json({
    message: '画像保存API',
    description: 'Base64エンコードされた画像データをサーバーに保存します',
    endpoint: {
      method: 'POST',
      body: {
        imageData: 'Base64エンコードされた画像データ（data:image/png;base64,... 形式）'
      },
      response: {
        success: '成功/失敗のブール値',
        path: 'Webパス（/uploads/filename.png）',
        absolutePath: '絶対パス（Pythonスクリプト用）',
        filename: 'ファイル名',
        error: 'エラーメッセージ（エラー時のみ）'
      }
    }
  });
}