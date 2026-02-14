// app/api/uploads/[...path]/route.ts
// カスタム画像ハンドラーを作成して、画像の保存と取得を管理
// 注意: Next.js 13+ App Routerの場合、このファイルは以下のパスに配置します：
// app/api/uploads/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir, writeFile, stat } from 'fs/promises';
import path from 'path';

// ファイルが存在するかを非同期でチェック
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// 動的にファイルパスを取得（ビルド時の静的解析を回避）
function getUploadBasePaths(): string[] {
  if (process.env.NODE_ENV === 'production') {
    return [
      '/var/www/kabu_ai/public/uploads',
      '/var/www/kabu_ai/.next/standalone/public/uploads'
    ];
  }
  return [path.join(process.cwd(), 'public', 'uploads')];
}

// 画像を取得するGETハンドラー
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;

    // パストラバーサル攻撃を防止
    if (pathSegments.some(segment => segment.includes('..') || segment.includes('\0'))) {
      return new NextResponse('Invalid path', { status: 400 });
    }

    const relativePath = pathSegments.join('/');
    const basePaths = getUploadBasePaths();

    let fileBuffer = null;
    let foundPath = null;

    for (const basePath of basePaths) {
      const filePath = path.resolve(basePath, relativePath);
      // パスがベースディレクトリ内に収まっているか確認
      if (!filePath.startsWith(basePath)) {
        continue;
      }
      if (await fileExists(filePath)) {
        fileBuffer = await readFile(filePath);
        foundPath = filePath;
        break;
      }
    }

    if (!fileBuffer || !foundPath) {
      // ローカル開発環境のみ: 本番サーバーからプロキシ
      if (process.env.NODE_ENV !== 'production') {
        try {
          const remoteUrl = `http://133.130.102.77:3000/uploads/${relativePath}`;
          const remoteRes = await fetch(remoteUrl);
          if (remoteRes.ok) {
            const remoteBuffer = await remoteRes.arrayBuffer();
            const ext = path.extname(relativePath).toLowerCase();
            const contentType = getContentType(ext);
            const response = new NextResponse(Buffer.from(remoteBuffer));
            response.headers.set('Content-Type', contentType);
            response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            return response;
          }
        } catch {
          // プロキシ失敗時は404を返す
        }
      }
      return new NextResponse('Image not found', { status: 404 });
    }

    const ext = path.extname(foundPath).toLowerCase();
    const contentType = getContentType(ext);

    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return response;
  } catch (error) {
    console.error('Error in GET handler:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 画像をアップロードするPOSTハンドラー
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ファイル名の生成（タイムスタンプ付き）
    const timestamp = Date.now();
    const originalName = file.name;
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const fileName = `${nameWithoutExt}_${timestamp}${ext}`;

    // 保存先ディレクトリの作成（年/月形式）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dirPath = path.join(process.cwd(), 'public/uploads/post_images', String(year), month);
    
    // ディレクトリが存在しない場合は作成
    await mkdir(dirPath, { recursive: true });

    // ファイルの保存
    const filePath = path.join(dirPath, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // URLパスの生成
    const urlPath = `/uploads/post_images/${year}/${month}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: urlPath,
      fileName: fileName,
      size: file.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload file', details: errorMessage },
      { status: 500 }
    );
  }
}

function getContentType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

