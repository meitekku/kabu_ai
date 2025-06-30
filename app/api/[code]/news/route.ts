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
    const days = body.days || 1;
    const excludeId = body.excludeId; // New parameter to exclude specific article ID

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Stock code is required' },
        { status: 400 }
      );
    }

    const db = Database.getInstance();
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    
    const todayStr = today.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let query: string;
    let queryParams: any[];

    if (code === 'all') {
      query = `SELECT p.id, p.code, p.title, p.content, p.created_at, ps.status
               FROM post p
               LEFT JOIN post_status ps ON p.id = ps.post_id
               WHERE 
                p.accept = 1
                AND p.site = 0
                AND DATE(p.created_at) >= ?
                AND DATE(p.created_at) <= ?
                ${excludeId ? 'AND p.id != ?' : ''}
               ORDER BY p.created_at DESC
               LIMIT 100`;
      queryParams = excludeId ? [startDateStr, todayStr, excludeId] : [startDateStr, todayStr];
    } else {
      query = `SELECT p.id, p.code, p.title, p.created_at, ps.status
               FROM post p
               LEFT JOIN post_status ps ON p.id = ps.post_id
               WHERE p.code = ?
               AND p.accept = 1
               ${excludeId ? 'AND p.id != ?' : ''}
               ORDER BY p.created_at DESC
               LIMIT ?`;
      queryParams = excludeId ? [code, excludeId, limit] : [code, limit];
    }
    const news = await db.select<NewsRecord>(query, queryParams);
    
    // created_atのフォーマットを修正
    const formattedNews = news.map(item => ({
      ...item,
      created_at: new Date(item.created_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-')
    }));

    return NextResponse.json({ success: true, data: formattedNews });
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}