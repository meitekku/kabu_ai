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
) {
  try {
    const {code} = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Stock code is required' },
        { status: 400 }
      );
    }

    const db = Database.getInstance();
    const news = await db.select<NewsRecord>(
      `SELECT 
        id,
        code,
        title,
        created_at
      FROM news_ai 
      WHERE code = ?
      AND accept = 1
      ORDER BY created_at DESC
      LIMIT 50`,
      [code]
    );

    console.log('News:', news);

    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}