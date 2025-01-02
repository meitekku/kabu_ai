import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface NewsRecord extends RowDataPacket {
  id: number;
  title: string;
  created_at: Date;
  code: string;
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
    const query = code === 'all'
      ? `SELECT id, code, title, created_at
         FROM post 
         WHERE accept = 1
         ORDER BY created_at DESC
         LIMIT 150`
      : `SELECT id, code, title, created_at
         FROM post 
         WHERE code = ?
         AND accept = 1
         ORDER BY created_at DESC
         LIMIT ?`;
         
    const queryParams = code === 'all' ? [limit] : [code, limit];
    const news = await db.select<NewsRecord>(query, queryParams);

    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}