import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';

const ALLOWED_TABLES = [
  'ranking_yahoo_post',
  'ranking_access',
  'ranking_up',
  'ranking_low',
  'ranking_stop_high',
  'ranking_stop_low',
  'ranking_trading_value',
  'ranking_pts_up',
  'ranking_pts_down',
] as const;

const PTS_TABLES: ReadonlyArray<string> = ['ranking_pts_up', 'ranking_pts_down'];

const ORDER_BY_MAP: Partial<Record<AllowedTable, string>> = {
  ranking_up: 'company_info.diff_percent DESC',
  ranking_low: 'company_info.diff_percent ASC',
  ranking_stop_high: 'company_info.diff_percent DESC',
  ranking_stop_low: 'company_info.diff_percent ASC',
  ranking_pts_up: 'ranking_pts_up.id ASC',
  ranking_pts_down: 'ranking_pts_down.id ASC',
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type AllowedTable = typeof ALLOWED_TABLES[number];

interface BaseRankingData extends RowDataPacket {
  id: number;
  code: string;
  name: string;            // 会社名を追加
  diff_percent: number;    // 騰落率を追加
  current_price: number;   // 現在価格を追加
}

interface RequestBody {
  tableName: AllowedTable;
  limit?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { tableName, limit = DEFAULT_LIMIT } = await request.json() as RequestBody;

    if (!tableName) {
      return NextResponse.json({
        success: false,
        message: 'Table name is required',
      } as ApiResponse<never>, { status: 400 });
    }

    if (!ALLOWED_TABLES.includes(tableName)) {
      return NextResponse.json({
        success: false,
        message: 'Access to this table is not allowed',
      } as ApiResponse<never>, { status: 403 });
    }

    const validatedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

    // キャッシュチェック
    const cacheKey = makeCacheKey('ranking', { tableName, limit: validatedLimit });
    const ttl = getCacheTTL('ranking');
    const cached = cacheGet(cacheKey, ttl);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'HIT' }
      });
    }

    const db = Database.getInstance();

    const orderBy = ORDER_BY_MAP[tableName] ?? `${tableName}.id ASC`;

    let query: string;
    if (PTS_TABLES.includes(tableName)) {
      query = `
        SELECT DISTINCT
          ${tableName}.code,
          company.name,
          ROUND((pts_price.price - company_info.current_price) / company_info.current_price * 100, 2) as diff_percent,
          pts_price.price as current_price
        FROM ${tableName}
        LEFT JOIN company ON ${tableName}.code = company.code
        LEFT JOIN company_info ON ${tableName}.code = company_info.code
        LEFT JOIN pts_price ON ${tableName}.code = pts_price.code
        WHERE company.market IN (1, 2, 3)
          AND company_info.current_price > 0
        ORDER BY ${orderBy}
        LIMIT ?
      `;
    } else {
      query = `
        SELECT DISTINCT
          ${tableName}.code,
          company.name,
          company_info.diff_percent,
          company_info.current_price
        FROM ${tableName}
        LEFT JOIN company ON ${tableName}.code = company.code
        LEFT JOIN company_info ON ${tableName}.code = company_info.code
        WHERE company.market IN (1, 2, 3)
        ORDER BY ${orderBy}
        LIMIT ?
      `;
    }

    const data = await db.select<BaseRankingData>(query, [validatedLimit]);

    const responseData = { success: true, data: data } as ApiResponse<BaseRankingData>;
    cacheSet(cacheKey, responseData);
    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'MISS' }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    } as ApiResponse<never>, { status: 500 });
  }
}