// app/api/routes/[...path]/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

type Params = Promise<{ path: string[] }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
): Promise<NextResponse> {
  console.log('=== File Request Debug ===');
  
  // params を await する
  const resolvedParams = await params;
  const filePath = resolvedParams.path;
  
  console.log('Requested path array:', filePath);
  console.log('Request URL:', request.url);
  
  // セキュリティチェック
  const safePath = filePath.filter((segment: string) => 
    !segment.includes('..') && segment.trim() !== ''
  );
  
  console.log('Safe path array:', safePath);
  
  // Try multiple possible file locations for standalone mode
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'uploads', ...safePath), // Standard location
    path.join(process.cwd(), '../public', 'uploads', ...safePath), // Parent directory
    path.join('/var/www/kabu_ai/public', 'uploads', ...safePath), // Absolute path
    path.join(process.cwd(), '../../../public', 'uploads', ...safePath), // Deep nesting
  ];
  
  console.log('Possible file paths:', possiblePaths);
  
  let fullPath = '';
  let foundFile = false;
  
  for (const testPath of possiblePaths) {
    console.log('Testing path:', testPath);
    if (fs.existsSync(testPath)) {
      fullPath = testPath;
      foundFile = true;
      console.log('✅ Found file at:', fullPath);
      break;
    }
  }
  
  if (!foundFile) {
    console.log('❌ File not found in any location');
    console.log('Current working directory:', process.cwd());
  }
  
  try {
    if (!foundFile || !fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // ディレクトリトラバーサル攻撃の防止 - multiple allowed paths for standalone mode
    const allowedBasePaths = [
      path.join(process.cwd(), 'public', 'uploads'),
      path.join(process.cwd(), '../public', 'uploads'),
      path.join('/var/www/kabu_ai/public', 'uploads'),
      path.join(process.cwd(), '../../../public', 'uploads'),
    ];
    
    const isPathAllowed = allowedBasePaths.some(basePath => 
      fullPath.startsWith(basePath)
    );
    
    if (!isPathAllowed) {
      console.log('Access denied for path:', fullPath);
      console.log('Allowed base paths:', allowedBasePaths);
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