// app/api/another/yahoo-ranking/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface YahooBbsRanking extends RowDataPacket {
  code: string;
  company_name: string;
}

export async function POST(request: NextRequest) {
  try {
    // Bodyの取得
    const { code } = await request.json();

    const db = Database.getInstance();

    // codeが空なら全データを取得
    const query = code
      ? `SELECT y.*, c.name as company_name 
         FROM yahoo_bbs_post_ranking y 
         LEFT JOIN company c ON y.code = c.code 
         WHERE y.code = ?`
      : `SELECT y.*, c.name as company_name 
         FROM yahoo_bbs_post_ranking y 
         LEFT JOIN company c ON y.code = c.code`;

    const params = code ? [code] : [];
    const rankings = await db.select<YahooBbsRanking>(query, params);

    if (rankings.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: rankings,
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
}
