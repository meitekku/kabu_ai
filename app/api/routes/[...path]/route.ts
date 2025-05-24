// app/api/routes/[...path]/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  console.log('=== File Request Debug ===');
  console.log('Requested path array:', params.path);
  console.log('Request URL:', request.url);
  
  const filePath = params.path;
  
  // セキュリティチェック
  const safePath = filePath.filter((segment: string) => 
    !segment.includes('..') && segment.trim() !== ''
  );
  
  console.log('Safe path array:', safePath);
  
  const fullPath = path.join(process.cwd(), 'public', 'uploads', ...safePath);
  console.log('Full file path:', fullPath);
  console.log('File exists:', fs.existsSync(fullPath));
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // ディレクトリトラバーサル攻撃の防止
    const publicUploadsPath = path.join(process.cwd(), 'public', 'uploads');
    if (!fullPath.startsWith(publicUploadsPath)) {
      console.log('Access denied for path:', fullPath);
      return new NextResponse('Access denied', { status: 403 });
    }
    
    const stat = fs.statSync(fullPath);
    const fileBuffer = fs.readFileSync(fullPath);
    
    console.log('File size:', stat.size);
    console.log('File modified:', stat.mtime);
    
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
    console.log('Content type:', contentType);
    
    const etag = `"${stat.mtime.getTime()}-${stat.size}"`;
    
    // 条件付きリクエストの処理
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      console.log('304 Not Modified');
      return new NextResponse(null, { status: 304 });
    }
    
    console.log('200 OK - File served successfully');
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