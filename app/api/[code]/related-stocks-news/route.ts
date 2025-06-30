import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { ServerToDate } from '@/utils/format/ServerToDate';
import { RowDataPacket } from 'mysql2';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const database = Database.getInstance();
  
  try {
    const { code } = await params;
    const body = await request.json();
    const limit = body.limit || 5;
    const excludeId = body.excludeId;

    // 関連銘柄のコードを取得
    const relatedStocksQuery = `
      SELECT relative_code 
      FROM relative_stock 
      WHERE code = ?
    `;
    const relatedStocks = await database.select(relatedStocksQuery, [code]) as RowDataPacket[];

    if (!relatedStocks || relatedStocks.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 関連銘柄のコードを配列で取得
    const relatedCodes = relatedStocks.map((row: RowDataPacket) => row.relative_code);
    
    // IN句用のプレースホルダーを作成
    const placeholders = relatedCodes.map(() => '?').join(',');
    
    // 関連銘柄の最新記事を取得
    const query = `
      SELECT 
        p.id, 
        p.code, 
        p.title, 
        p.content, 
        p.created_at,
        c.name as company_name,
        ps.status
      FROM post p
      JOIN company c ON p.code = c.code
      LEFT JOIN post_status ps ON p.id = ps.post_id
      WHERE p.code IN (${placeholders})
      AND p.accept = 1
      ${excludeId ? 'AND p.id != ?' : ''}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

    const queryParams = [...relatedCodes];
    if (excludeId) {
      queryParams.push(excludeId);
    }
    queryParams.push(limit);

    const results = await database.select(query, queryParams) as RowDataPacket[];

    // 日付フォーマット処理
    const formattedResults = results.map((row: RowDataPacket) => ({
      ...row,
      created_at: ServerToDate(row.created_at)
    }));

    return NextResponse.json({ data: formattedResults });
  } catch (error) {
    console.error('Error fetching related stocks news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related stocks news' },
      { status: 500 }
    );
  }
}