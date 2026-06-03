import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { ServerToDate } from '@/utils/format/ServerToDate';
import { RowDataPacket } from 'mysql2';
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';

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

    // キャッシュチェック
    const cacheKey = makeCacheKey('related-news', { code, limit, excludeId });
    const ttl = getCacheTTL('news');
    const cached = cacheGet(cacheKey, ttl);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'HIT' }
      });
    }

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
      SELECT DISTINCT
        p.id, 
        pc.code, 
        p.title, 
        p.content, 
        p.created_at,
        c.name as company_name,
        ps.status
      FROM post p
      JOIN post_code pc ON p.id = pc.post_id
      JOIN company c ON pc.code = c.code
      LEFT JOIN post_status ps ON p.id = ps.post_id
      WHERE pc.code IN (${placeholders})
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

    const responseData = { data: formattedResults };
    cacheSet(cacheKey, responseData);
    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error('Error fetching related stocks news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related stocks news' },
      { status: 500 }
    );
  }
}