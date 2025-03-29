import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface NewsRecord extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  created_at: string;
  code: string;
  status?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const body = await request.json();
    const limit = body.limit || 10;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Stock code is required' },
        { status: 400 }
      );
    }

    const db = Database.getInstance();
    const today = new Date().toISOString().split('T')[0];
    
    const query = code === 'all'
      ? `SELECT p.id, p.code, p.title, p.content, p.created_at, ps.status
         FROM post p
         LEFT JOIN post_status ps ON p.id = ps.post_id
         WHERE 
          p.accept = 1
          AND p.site = 0
          AND DATE(p.created_at) = ?
         ORDER BY p.created_at DESC
         LIMIT 100`
      : `SELECT p.id, p.code, p.title, p.created_at, ps.status
         FROM post p
         LEFT JOIN post_status ps ON p.id = ps.post_id
         WHERE p.code = ?
         AND p.accept = 1
         ORDER BY p.created_at DESC
         LIMIT ?`;
         
    const queryParams = code === 'all' ? [today] : [code, limit];
    const news = await db.select<NewsRecord>(query, queryParams);
    console.log(news);

    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}