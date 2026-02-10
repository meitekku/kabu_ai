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
] as const;

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

    const query = `
      SELECT 
        ${tableName}.code,
        company.name,
        company_info.diff_percent,
        company_info.current_price
      FROM ${tableName}
      LEFT JOIN company ON ${tableName}.code = company.code
      LEFT JOIN company_info ON ${tableName}.code = company_info.code
      LIMIT ?
    `;
    
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