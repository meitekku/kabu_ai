import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  
  if (!filePath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }

  const fullPath = path.join('/var/www/kabu_ai/public/uploads', filePath);
  
  try {
    const exists = fs.existsSync(fullPath);
    const stats = exists ? fs.statSync(fullPath) : null;
    
    return NextResponse.json({
      requestedPath: filePath,
      fullPath: fullPath,
      exists: exists,
      isFile: stats?.isFile() || false,
      isDirectory: stats?.isDirectory() || false,
      permissions: stats ? {
        mode: stats.mode,
        uid: stats.uid,
        gid: stats.gid,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error checking file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 