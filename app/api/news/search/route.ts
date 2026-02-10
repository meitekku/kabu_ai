import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface PostRow extends RowDataPacket {
  id: number;
  code: string | null;
  title: string | null;
  content: string | null;
  site: number | null;
  accept: number;
  pickup: number;
  created_at: Date;
  updated_at: Date;
}

interface CountResult extends RowDataPacket {
  total: number;
}

// --- インメモリキャッシュ ---
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// 時間帯に応じたキャッシュTTL（秒）
// 12:30〜13:30, 15:30〜16:30 は更新時間帯 → 短いTTL
// それ以外は記事が変わらない → 長いTTL
function getCacheTTL(): number {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const h = jst.getHours();
  const m = jst.getMinutes();
  const minutes = h * 60 + m;

  // 12:25〜13:30 → 更新時間帯（2分キャッシュ）
  if (minutes >= 745 && minutes <= 810) return 120;
  // 15:25〜16:30 → 更新時間帯（2分キャッシュ）
  if (minutes >= 925 && minutes <= 990) return 120;
  // それ以外 → 10分キャッシュ
  return 600;
}

function getCacheKey(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

export async function POST(req: Request) {
  try {
    const {
      pickup,         // ピックアップタイプ（1: ピックアップ, 2: 市場, 3: 企業）
      company_code,   // 企業コード
      keyword,        // キーワード検索
      from_date,      // 開始日
      to_date,        // 終了日
      limit = 10,     // 取得件数
      page = 1,       // ページ番号
      site_type = 0   // サイトタイプ
    } = await req.json();

    // キャッシュチェック
    const cacheKey = getCacheKey({ pickup, company_code, keyword, from_date, to_date, limit, page, site_type });
    const ttl = getCacheTTL();
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ttl * 1000) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
          'X-Cache': 'HIT',
        }
      });
    }

    const db = Database.getInstance();

    const conditions: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    const needsJoin = !!company_code;

    if (site_type !== undefined) {
      if (Array.isArray(site_type)) {
        const placeholders = site_type.map(() => '?').join(',');
        conditions.push(`p.site IN (${placeholders})`);
        values.push(...site_type);
      } else {
        conditions.push('p.site = ?');
        values.push(site_type);
      }
    }

    if (pickup) {
      conditions.push('p.pickup = ?');
      values.push(pickup);
    }

    if (company_code) {
      conditions.push('pc.code = ?');
      values.push(String(company_code));
    }

    if (keyword) {
      conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      values.push(`%${keyword}%`);
      values.push(`%${keyword}%`);
    }

    if (from_date) {
      conditions.push('p.created_at >= ?');
      values.push(from_date);
    }

    if (to_date) {
      conditions.push('p.created_at <= ?');
      values.push(to_date);
    }

    const whereClause = conditions.length > 0
      ? ` AND ${conditions.join(' AND ')}`
      : '';

    let countQuery: string;
    let query: string;

    if (needsJoin) {
      // company_codeフィルタ時はJOINが必要
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM post p
        INNER JOIN post_code pc ON p.id = pc.post_id
        WHERE p.accept = 1${whereClause}
      `;
      query = `
        SELECT p.id, pc.code, p.title, SUBSTRING(p.content, 1, 500) as content,
          p.site, p.pickup, p.created_at, p.updated_at,
          c.name as company_name
        FROM post p
        INNER JOIN post_code pc ON p.id = pc.post_id
        LEFT JOIN company c ON pc.code = c.code
        WHERE p.accept = 1${whereClause}
        ORDER BY p.created_at DESC
      `;
    } else {
      // JOINなしのサブクエリ方式（高速）
      countQuery = `
        SELECT COUNT(*) as total
        FROM post p
        WHERE p.accept = 1${whereClause}
      `;
      query = `
        SELECT p.id, p.title, SUBSTRING(p.content, 1, 500) as content,
          p.site, p.pickup, p.created_at, p.updated_at,
          (SELECT pc.code FROM post_code pc WHERE pc.post_id = p.id LIMIT 1) as code,
          (SELECT c.name FROM post_code pc2 JOIN company c ON pc2.code = c.code WHERE pc2.post_id = p.id LIMIT 1) as company_name
        FROM post p
        WHERE p.accept = 1${whereClause}
        ORDER BY p.created_at DESC
      `;
    }

    // ページネーション
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;

    const countValues = [...values];
    values.push(limit);
    values.push(offset);

    // 総件数を取得
    const [totalResult] = await db.select<CountResult>(countQuery, countValues);
    const total = totalResult.total;

    // データを取得
    const posts = await db.select<PostRow>(query, values);

    // created_atとupdated_atのフォーマットを修正
    const formattedPosts = posts.map(post => ({
      ...post,
      created_at: new Date(post.created_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-').replace(/,/g, ''),
      updated_at: new Date(post.updated_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-').replace(/,/g, '')
    }));

    const responseData = {
      success: true,
      data: formattedPosts,
      total: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };

    // キャッシュに保存
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    // 古いキャッシュエントリを定期的に削除（100エントリ超えたら）
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of cache) {
        if (now - entry.timestamp > 600_000) cache.delete(key);
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
        'X-Cache': 'MISS',
      }
    });

  } catch (error) {
    console.error('Error in news search:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });
  }
} 