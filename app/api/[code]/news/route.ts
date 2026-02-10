import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';

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
    const page = body.page || 1; // ページ番号 (1から始まる)
    const offset = (page - 1) * limit; // オフセット計算
    const targetDate = body.target_date; // 対象日付パラメータを追加
    // const institution = body.institution; // ニュース機関フィルタ（将来的に使用予定）

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Stock code is required' },
        { status: 400 }
      );
    }

    // キャッシュチェック
    const cacheKey = makeCacheKey('code-news', { code, limit, days, excludeId, page, targetDate });
    const ttl = getCacheTTL('news');
    const cached = cacheGet(cacheKey, ttl);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'HIT' }
      });
    }

    const db = Database.getInstance();
    
    const today = new Date();
    let startDate: Date;
    let startDateStr: string;
    const todayStr = today.toISOString().split('T')[0];
    
    // target_dateが指定されている場合はそれを使用、そうでない場合は従来のdays計算を使用
    if (targetDate) {
      startDateStr = targetDate;
      console.log(`記事API: target_date指定あり - ${startDateStr}以降の記事を取得`);
    } else {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));
      startDateStr = startDate.toISOString().split('T')[0];
      console.log(`記事API: days指定 - ${days}日前（${startDateStr}）以降の記事を取得`);
    }
    
    let query: string;
    let queryParams: (string | number)[];

    // 総件数を取得するクエリ
    let countQuery: string;
    let countParams: (string | number)[];

    if (code === 'all') {
      countQuery = `SELECT COUNT(DISTINCT p.id) as total
                   FROM post p
                   LEFT JOIN post_code pc ON p.id = pc.post_id
                   WHERE 
                    p.accept > 0
                    AND p.site >= 0
                    AND DATE(p.created_at) >= ?
                    AND DATE(p.created_at) <= ?
                    ${excludeId ? 'AND p.id != ?' : ''}`;
      countParams = excludeId ? [startDateStr, todayStr, excludeId] : [startDateStr, todayStr];
      
      query = `SELECT DISTINCT p.id, pc.code, p.title, p.content, p.created_at, ps.status
               FROM post p
               LEFT JOIN post_code pc ON p.id = pc.post_id
               LEFT JOIN post_status ps ON p.id = ps.post_id
               WHERE 
                p.accept > 0
                AND p.site >= 0
                AND DATE(p.created_at) >= ?
                AND DATE(p.created_at) <= ?
                ${excludeId ? 'AND p.id != ?' : ''}
               ORDER BY p.created_at DESC
               LIMIT ? OFFSET ?`;
      queryParams = excludeId ? [startDateStr, todayStr, excludeId, limit, offset] : [startDateStr, todayStr, limit, offset];
    } else {
      countQuery = `SELECT COUNT(DISTINCT p.id) as total
                   FROM post p
                   JOIN post_code pc ON p.id = pc.post_id
                   WHERE pc.code = ?
                   AND p.accept = 1
                   ${excludeId ? 'AND p.id != ?' : ''}`;
      countParams = excludeId ? [code, excludeId] : [code];
      
      query = `SELECT DISTINCT p.id, pc.code, p.title, p.created_at, ps.status
               FROM post p
               JOIN post_code pc ON p.id = pc.post_id
               LEFT JOIN post_status ps ON p.id = ps.post_id
               WHERE pc.code = ?
               AND p.accept = 1
               ${excludeId ? 'AND p.id != ?' : ''}
               ORDER BY p.created_at DESC
               LIMIT ? OFFSET ?`;
      queryParams = excludeId ? [code, excludeId, limit, offset] : [code, limit, offset];
    }
    
    // 総件数を取得
    const countResult = await db.select<RowDataPacket & { total: number }>(countQuery, countParams);
    const totalItems = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);
    
    // ニュースデータを取得
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

    // ページネーション情報を含むレスポンス
    const responseData = {
      success: true,
      data: formattedNews,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    };
    cacheSet(cacheKey, responseData);
    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}