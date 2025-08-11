import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // FormDataから画像を取得
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: '画像ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // ファイル形式をチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です' },
        { status: 400 }
      );
    }

    // 一意のファイル名を生成
    const fileExtension = imageFile.name.split('.').pop() || 'png';
    const fileName = `${uuidv4()}.${fileExtension}`;

    // 一時ディレクトリのパス
    const uploadsDir = path.join(process.cwd(), 'temp', 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    // ディレクトリが存在しない場合は作成
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合はエラーを無視
    }

    // ファイルを保存
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      filePath: filePath,
      fileName: fileName,
      message: '画像のアップロードが完了しました'
    });

  } catch (error) {
    console.error('画像アップロードエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '画像のアップロードに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}

// GETリクエスト（動作確認用）
export async function GET() {
  return NextResponse.json({
    message: '画像一時アップロードAPI',
    description: 'Twitter投稿用の画像を一時的にアップロードするエンドポイント',
    usage: 'POST multipart/form-data with "image" field'
  });
}