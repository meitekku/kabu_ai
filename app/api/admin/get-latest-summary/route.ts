import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface SummaryPost extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const db = Database.getInstance();
    
    // 本日生成されたsite=72のニュース要約記事を取得
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        id,
        title,
        content,
        created_at,
        updated_at
      FROM post
      WHERE site = 72
      AND DATE(created_at) = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const posts = await db.select<SummaryPost>(query, [today]);

    if (posts.length === 0) {
      return NextResponse.json({
        success: false,
        message: '本日生成されたニュース要約記事が見つかりません',
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      message: 'ニュース要約記事を取得しました',
      data: posts[0]
    });

  } catch (error) {
    console.error('Get latest summary error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}