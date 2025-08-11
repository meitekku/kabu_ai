import { NextResponse } from 'next/server';
import { readdir, unlink, stat } from 'fs/promises';
import path from 'path';

export async function POST() {
  try {
    const uploadsDir = path.join(process.cwd(), 'temp', 'uploads');
    
    // 24時間以上古いファイルを削除
    const maxAge = 24 * 60 * 60 * 1000; // 24時間をミリ秒で
    const now = Date.now();
    
    let filesDeleted = 0;
    let errors = 0;
    
    try {
      const files = await readdir(uploadsDir);
      
      for (const file of files) {
        try {
          const filePath = path.join(uploadsDir, file);
          const stats = await stat(filePath);
          
          // ファイルが24時間以上古い場合は削除
          if (now - stats.mtime.getTime() > maxAge) {
            await unlink(filePath);
            filesDeleted++;
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          errors++;
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `一時ファイルのクリーンアップが完了しました`,
      filesDeleted,
      errors,
      maxAgeHours: 24
    });

  } catch (error) {
    console.error('一時ファイルクリーンアップエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '一時ファイルのクリーンアップに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}

// GETリクエスト（動作確認用）
export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'temp', 'uploads');
    
    let fileCount = 0;
    let totalSize = 0;
    
    try {
      const files = await readdir(uploadsDir);
      
      for (const file of files) {
        try {
          const filePath = path.join(uploadsDir, file);
          const stats = await stat(filePath);
          fileCount++;
          totalSize += stats.size;
        } catch (error) {
          // ファイル処理エラーは無視
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
    
    return NextResponse.json({
      message: '一時ファイルクリーンアップAPI',
      currentFiles: fileCount,
      totalSizeBytes: totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      usage: 'POST to trigger cleanup of files older than 24 hours'
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: '情報取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}