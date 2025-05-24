// app/api/uploads/[...path]/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: {
    path: string[];
  };
}

export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const filePath = params.path;
  
  // セキュリティチェック
  const safePath = filePath.filter((segment: string) => 
    !segment.includes('..') && segment.trim() !== ''
  );
  
  const fullPath = path.join(process.cwd(), 'public', 'uploads', ...safePath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    // ディレクトリトラバーサル攻撃の防止
    const publicUploadsPath = path.join(process.cwd(), 'public', 'uploads');
    if (!fullPath.startsWith(publicUploadsPath)) {
      return new NextResponse('Access denied', { status: 403 });
    }
    
    const stat = fs.statSync(fullPath);
    const fileBuffer = fs.readFileSync(fullPath);
    
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const etag = `"${stat.mtime.getTime()}-${stat.size}"`;
    
    // 条件付きリクエストの処理
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
      },
    });
    
  } catch (error) {
    console.error('File serving error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}